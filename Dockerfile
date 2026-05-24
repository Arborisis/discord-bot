FROM node:22-bookworm-slim

# Installer ffmpeg, outils de compilation, Java pour Lavalink, et curl
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    python3 \
    make \
    g++ \
    libopus-dev \
    default-jre-headless \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Télécharger Lavalink (v4.0.8 - dernière stable)
RUN mkdir -p /app && curl -L -o /app/Lavalink.jar \
    https://github.com/lavalink-devs/Lavalink/releases/download/4.0.8/Lavalink.jar

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src
COPY application.yml ./
COPY ecosystem.config.js ./
COPY start.sh ./
RUN chmod +x start.sh

CMD ["./start.sh"]
