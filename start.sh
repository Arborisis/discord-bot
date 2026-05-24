#!/bin/bash
set -e

cd /app

# Lancer Lavalink en background
java -jar Lavalink.jar > /dev/null 2>&1 &
LAVALINK_PID=$!

# Détacher le processus du shell pour qu'il survive
disown $LAVALINK_PID

echo "[Start] Lavalink démarré (PID: $LAVALINK_PID)"

# Vérifier que Lavalink est bien en vie
sleep 5
if ! kill -0 $LAVALINK_PID 2>/dev/null; then
    echo "[Start] ERREUR: Lavalink s'est arrêté prématurément"
    exit 1
fi

echo "[Start] Attente de Lavalink (10s)..."
sleep 10

echo "[Start] Démarrage du bot Discord..."
exec node src/index.js
