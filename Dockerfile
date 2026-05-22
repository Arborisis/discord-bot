FROM node:22-bookworm-slim

# Installer ffmpeg (requis pour la radio Discord)
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src

CMD ["npm", "run", "start"]
