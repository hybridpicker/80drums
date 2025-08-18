#!/bin/bash

# Monitor-Script für drums.schoensgibl.com Auto-Deployment
# Prüft auf Server-Notifications und führt Build automatisch aus

SERVER="jarvis@94.130.37.43"
NOTIFICATION_FILE="/tmp/drums_build_needed"
PROJECT_DIR="/Users/lukasschonsgibl/Coding/drumcomputer"

check_for_updates() {
    echo "🔍 Checking for deployment notifications..."
    
    # Prüfe ob Notification-Datei auf Server existiert
    if ssh "$SERVER" "test -f $NOTIFICATION_FILE"; then
        echo "📢 Build notification found!"
        
        # Lade Notification
        NOTIFICATION=$(ssh "$SERVER" "cat $NOTIFICATION_FILE 2>/dev/null || echo '{}'")
        echo "📄 Notification: $NOTIFICATION"
        
        # Führe Build und Deployment aus
        echo "🏗️  Starting local build and deployment..."
        
        cd "$PROJECT_DIR" || {
            echo "❌ Cannot access project directory: $PROJECT_DIR"
            return 1
        }
        
        # Git pull (um sicherzugehen, dass wir latest haben)
        echo "📥 Pulling latest changes..."
        git pull origin main
        
        # Build
        echo "🔨 Building project..."
        npm run build || {
            echo "❌ Build failed!"
            return 1
        }
        
        # Deploy to server
        echo "🚀 Deploying to server..."
        rsync -avz --delete dist/ "$SERVER:/var/www/drums.schoensgibl.com/dist/" || {
            echo "❌ Deployment failed!"
            return 1
        }
        
        # Reload nginx
        echo "🔄 Reloading nginx..."
        ssh "$SERVER" "sudo systemctl reload nginx"
        
        # Remove notification file
        ssh "$SERVER" "rm -f $NOTIFICATION_FILE"
        
        echo "✅ Deployment completed successfully!"
        echo "🌐 Site updated: https://drums.schoensgibl.com"
        
        return 0
    else
        echo "💤 No deployment needed"
        return 1
    fi
}

# Hauptfunktion
main() {
    echo "🎵 Drums.schoensgibl.com Auto-Deploy Monitor"
    echo "========================================"
    echo "Time: $(date)"
    echo ""
    
    if check_for_updates; then
        echo ""
        echo "🎉 Auto-deployment cycle completed!"
    else
        echo ""
        echo "😴 Nothing to deploy"
    fi
}

# Script ausführen wenn direkt aufgerufen
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
