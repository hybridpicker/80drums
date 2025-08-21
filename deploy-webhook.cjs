#!/usr/bin/env node

/**
 * Lokaler Webhook-Server für Auto-Deployment
 * Läuft auf dem lokalen Mac und reagiert auf Server-Notifications
 */

const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const CONFIG = {
  checkInterval: 30000, // 30 Sekunden
  serverHost: '94.130.37.43',
  serverUser: 'jarvis',
  notificationFile: '/tmp/drums_build_needed',
  projectDir: '/Users/lukasschonsgibl/Coding/drumcomputer',
  serverDistDir: '/var/www/drums.schoensgibl.com/dist/'
};

let isDeploying = false;

function log(message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

function executeCommand(command, description) {
  log(`🔄 ${description}...`);
  try {
    const output = execSync(command, { 
      cwd: CONFIG.projectDir, 
      stdio: 'pipe',
      encoding: 'utf8' 
    });
    log(`✅ ${description} erfolgreich`);
    return output.trim();
  } catch (error) {
    log(`❌ ${description} fehlgeschlagen: ${error.message}`);
    throw error;
  }
}

async function checkForNotification() {
  try {
    // Check if notification exists on server
    const checkCmd = `ssh ${CONFIG.serverUser}@${CONFIG.serverHost} "test -f ${CONFIG.notificationFile} && cat ${CONFIG.notificationFile} || echo 'NO_NOTIFICATION'"`;
    const result = executeCommand(checkCmd, 'Server-Notification prüfen');
    
    if (result === 'NO_NOTIFICATION') {
      return null;
    }
    
    // Parse notification
    const notification = JSON.parse(result);
    log(`📢 Notification gefunden: ${notification.old_commit} → ${notification.new_commit}`);
    return notification;
    
  } catch (error) {
    log(`⚠️ Fehler beim Prüfen der Notification: ${error.message}`);
    return null;
  }
}

async function performDeployment(notification) {
  if (isDeploying) {
    log(`⏸️ Deployment bereits aktiv, überspringe...`);
    return;
  }
  
  isDeploying = true;
  
  try {
    log(`🚀 Auto-Deployment gestartet`);
    log(`📊 Alte Version: ${notification.old_commit}`);
    log(`📊 Neue Version: ${notification.new_commit}`);
    
    // 1. Git pull (sicherheitshalber)
    executeCommand('git pull origin main', 'Git pull');
    
    // 2. Build project
    executeCommand('npm run build', 'Vite Build');
    
    // 3. Upload to server
    const rsyncCmd = `rsync -avz --delete dist/ ${CONFIG.serverUser}@${CONFIG.serverHost}:${CONFIG.serverDistDir}`;
    executeCommand(rsyncCmd, 'Upload zu Server');
    
    // 4. Reload nginx
    const nginxCmd = `ssh ${CONFIG.serverUser}@${CONFIG.serverHost} "sudo systemctl reload nginx"`;
    executeCommand(nginxCmd, 'Nginx Reload');
    
    // 5. Remove notification
    const cleanupCmd = `ssh ${CONFIG.serverUser}@${CONFIG.serverHost} "rm -f ${CONFIG.notificationFile}"`;
    executeCommand(cleanupCmd, 'Notification-Cleanup');
    
    log(`🎉 Deployment erfolgreich abgeschlossen!`);
    log(`🌐 Website ist live: https://drums.schoensgibl.com`);
    
  } catch (error) {
    log(`💥 Deployment fehlgeschlagen: ${error.message}`);
  } finally {
    isDeploying = false;
  }
}

async function startMonitoring() {
  log(`🎯 Auto-Deployment Monitor gestartet`);
  log(`📡 Server: ${CONFIG.serverHost}`);
  log(`⏰ Check-Intervall: ${CONFIG.checkInterval/1000}s`);
  log(`📁 Projekt: ${CONFIG.projectDir}`);
  log(`🔍 Prüfe auf Server-Notifications...`);
  
  const interval = setInterval(async () => {
    const notification = await checkForNotification();
    
    if (notification) {
      await performDeployment(notification);
    } else {
      // Leiser Check - nur alle 5 Minuten loggen
      if (Date.now() % 300000 < CONFIG.checkInterval) {
        log(`💤 Keine Notifications - System läuft normal`);
      }
    }
  }, CONFIG.checkInterval);
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    log(`🛑 Monitor wird beendet...`);
    clearInterval(interval);
    process.exit(0);
  });
}

// Start the monitoring
startMonitoring();
