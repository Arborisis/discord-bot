#!/bin/bash
set -e

cd /app

# Lancer Lavalink en background avec nohup pour qu'il survive
nohup java -jar Lavalink.jar > /dev/null 2>&1 &
LAVALINK_PID=$!

echo "[Start] Lavalink démarré (PID: $LAVALINK_PID)"
echo "[Start] Attente de Lavalink (10s)..."
sleep 10

echo "[Start] Démarrage du bot Discord..."
exec node src/index.js
