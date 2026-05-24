FROM node:22-bookworm-slim

# Installer ffmpeg et les outils de compilation pour @discordjs/opus
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    python3 \
    make \
    g++ \
    libopus-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src

CMD ["npm", "run", "start"]
