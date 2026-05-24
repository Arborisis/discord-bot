#!/bin/bash
set -e

cd /app

echo "[Start] Démarrage du bot Discord..."
exec node src/index.js
