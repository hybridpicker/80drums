# 🎵 Auto-Deployment System für drums.schoensgibl.com

## 📋 Übersicht

Das Auto-Deployment-System überwacht alle 15 Minuten das GitHub-Repository und deployrt automatisch Änderungen zu https://drums.schoensgibl.com

## 🏗️ Architektur

### Server-Side (AlmaLinux 9)
- **Cronjob**: Alle 15 Minuten (`*/15 * * * *`)
- **Script**: `/home/jarvis/smart-deploy-drums.sh`
- **Log**: `/var/log/drums_deploy.log`
- **Repository**: `/var/www/drums.schoensgibl.com`
- **Web-Root**: `/var/www/drums.schoensgibl.com/dist`

### Client-Side (Lokaler Mac)
- **Monitor**: `./monitor-deploy.sh`
- **Build & Deploy**: Automatisch bei Benachrichtigung

## 🔄 Workflow

1. **Code ändern** → GitHub pushen
2. **Server erkennt** Änderungen alle 15min
3. **Server pullt** neuen Code
4. **Notification** wird erstellt (Build benötigt)
5. **Lokaler Monitor** erkennt Notification
6. **Automatischer Build** + Upload
7. **Nginx reload** + SSL-Check

## 🛠️ Verwendung

### Automatisch (Empfohlen)
Code einfach zu GitHub pushen - Rest passiert automatisch alle 15min.

### Manuell überwachen
```bash
# Alle 5 Minuten prüfen
while true; do
    ./monitor-deploy.sh
    sleep 300
done
```

### Sofortiges Deployment
```bash
# Build und deploy jetzt sofort
npm run build
rsync -avz --delete dist/ jarvis@94.130.37.43:/var/www/drums.schoensgibl.com/dist/
ssh jarvis@94.130.37.43 "sudo systemctl reload nginx"
```

## 📊 Monitoring

### Server-Logs prüfen
```bash
ssh jarvis@94.130.37.43 "tail -f /var/log/drums_deploy.log"
```

### Cronjob Status
```bash
ssh jarvis@94.130.37.43 "crontab -l | grep drums"
```

### Letzte Notification prüfen
```bash
ssh jarvis@94.130.37.43 "cat /tmp/drums_build_needed 2>/dev/null || echo 'Keine Notifications'"
```

## 🔧 Konfiguration

### Server-Konfiguration
- **Nginx**: `/etc/nginx/sites-available/drums.conf`
- **SSL**: Automatisch via Certbot
- **Auto-Renewal**: SSL erneuert sich automatisch

### Wichtige Dateien
```
/var/www/drums.schoensgibl.com/          # Git Repository
/var/www/drums.schoensgibl.com/dist/     # Built Static Files
/home/jarvis/smart-deploy-drums.sh       # Auto-Deploy Script
/var/log/drums_deploy.log               # Deployment Logs
/tmp/drums_build_needed                 # Build Notifications
/tmp/drums_last_commit                  # Letzter bekannter Commit
```

## 🚨 Troubleshooting

### Deployment hängt
```bash
ssh jarvis@94.130.37.43 "rm -f /tmp/drums_deploy.lock"
```

### Cronjob läuft nicht
```bash
ssh jarvis@94.130.37.43 "systemctl status crond"
```

### Build-Problem
Das System erkennt automatisch, dass Node.js 16 zu alt für Vite 5 ist und 
fordert lokalen Build an. Monitor-Script führt Build automatisch aus.

### SSL-Probleme
```bash
ssh jarvis@94.130.37.43 "sudo certbot renew --force-renewal -d drums.schoensgibl.com"
```

## ✅ Features

- ✅ **Git-Monitoring** alle 15 Minuten
- ✅ **Automatisches Deployment** bei Änderungen
- ✅ **SSL-Zertifikat** Auto-Renewal
- ✅ **Lock-File Protection** gegen parallele Deployments
- ✅ **Detaillierte Logs** mit Rotation
- ✅ **Nginx Cache-Clearing**
- ✅ **Smart Build-Handling** für Node.js Kompatibilität
- ✅ **Zero-Downtime** Deployments

## 🎯 Status

✅ **System ist aktiv und läuft!**

**Live-Site**: https://drums.schoensgibl.com
**Nächste Check**: Alle 15 Minuten zur vollen Viertelstunde
**SSL gültig bis**: 2025-11-16

Alle bestehenden Web-Apps auf dem Server laufen ungestört weiter.
