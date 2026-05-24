#!/bin/bash
set -e

# Démarrer Lavalink en background
echo "[Start] Démarrage de Lavalink..."
cd /app
java -jar Lavalink.jar &
LAVALINK_PID=$!

# Attendre que Lavalink soit prêt
echo "[Start] Attente de Lavalink (10s)..."
sleep 10

# Démarrer le bot Discord
echo "[Start] Démarrage du bot Discord..."
exec node src/index.js
