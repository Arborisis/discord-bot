#!/bin/bash
set -e

# Démarrer Lavalink en background
echo "[Start] Démarrage de Lavalink..."
cd /app
java -jar Lavalink.jar &
LAVALINK_PID=$!

# Attendre que Lavalink soit prêt (port 2333)
echo "[Start] Attente de Lavalink..."
for i in {1..30}; do
  if curl -s http://localhost:2333/version > /dev/null 2>&1; then
    echo "[Start] Lavalink prêt !"
    break
  fi
  sleep 1
done

# Démarrer le bot Discord
echo "[Start] Démarrage du bot Discord..."
exec node src/index.js
