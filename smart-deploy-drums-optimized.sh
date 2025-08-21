#!/bin/bash
set -e

# Konfiguration
PROJECT_DIR="/var/www/drums.schoensgibl.com"
LOCK_FILE="/tmp/drums_deploy.lock"
LOG_FILE="/home/jarvis/drums_deploy.log"
LAST_COMMIT_FILE="/tmp/drums_last_commit"
NOTIFICATION_FILE="/tmp/drums_build_needed"

# Log-Funktion
log() {
    local msg="[$(date '+%Y-%m-%d %H:%M:%S')] $1"
    echo "$msg"
    echo "$msg" >> "$LOG_FILE" 2>/dev/null || echo "$msg" > "$LOG_FILE"
}

# Lock-File Check
if [ -f "$LOCK_FILE" ]; then
    log "⏸️  Deployment bereits aktiv (Lock-File existiert). Abbruch."
    exit 0
fi

echo $$ > "$LOCK_FILE"
trap 'rm -f "$LOCK_FILE"' EXIT

log "🔍 Auto-Deploy Check gestartet für drums.schoensgibl.com"

cd "$PROJECT_DIR" || {
    log "❌ Cannot access project directory: $PROJECT_DIR"
    exit 1
}

# Git fetch mit besserer Fehlerbehandlung
log "📡 Fetching from remote repository..."
if ! git fetch origin main 2>/dev/null; then
    log "❌ Git fetch failed"
    exit 1
fi

CURRENT_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
REMOTE_COMMIT=$(git rev-parse origin/main 2>/dev/null || echo "unknown")

log "📊 Current commit: $CURRENT_COMMIT"
log "📊 Remote commit:  $REMOTE_COMMIT"

if [ "$CURRENT_COMMIT" = "$REMOTE_COMMIT" ]; then
    log "💤 Keine Änderungen gefunden. Kein Deployment nötig."
    exit 0
fi

log "🚨 NEUE ÄNDERUNGEN GEFUNDEN!"
log "🔄 Starting git pull..."

# Git pull
if ! git pull origin main; then
    log "❌ Git pull fehlgeschlagen"
    exit 1
fi

log "✅ Git pull erfolgreich"

# Build-Benachrichtigung erstellen mit Priority-Flag
log "📝 Erstelle PRIORITY Build-Benachrichtigung..."
cat > "$NOTIFICATION_FILE" << BUILD_EOF
{
    "timestamp": "$(date -Iseconds)",
    "project": "drums.schoensgibl.com", 
    "old_commit": "$CURRENT_COMMIT",
    "new_commit": "$REMOTE_COMMIT",
    "status": "build_needed_priority",
    "priority": true,
    "auto_deploy": true,
    "message": "🚨 PRIORITY: Auto-deployment detected changes. Immediate build required!",
    "changes_summary": "Git pull completed, awaiting local build and upload"
}
BUILD_EOF

# Commit speichern
echo "$REMOTE_COMMIT" > "$LAST_COMMIT_FILE"
log "💾 Neuer Commit gespeichert: $REMOTE_COMMIT"

# SOFORTIGE Benachrichtigung an lokalen Service (falls vorhanden)
if command -v curl >/dev/null 2>&1; then
    log "📲 Sende Sofort-Benachrichtigung an lokalen Webhook..."
    # Kleiner Trigger-File für sofortige Reaktion
    echo "PRIORITY_DEPLOY_$(date +%s)" > /tmp/drums_deploy_trigger
fi

# SSL-Check (non-blocking)
log "🔒 SSL-Zertifikat Check..."
if sudo certbot renew --quiet --nginx --dry-run 2>/dev/null; then
    log "✅ SSL-Check erfolgreich"
else
    log "⚠️  SSL-Check mit Warnung abgeschlossen"
fi

log "📢 PRIORITY Build-Benachrichtigung erstellt: $NOTIFICATION_FILE"
log "🎯 Deployment vorbereitet. Lokaler Webhook sollte in ~30s reagieren."
log "💡 Manuell: node deploy-webhook.js oder ./monitor-deploy.sh"
log "🚀 Auto-Deploy Status: NOTIFICATION READY - Warte auf lokalen Build..."
