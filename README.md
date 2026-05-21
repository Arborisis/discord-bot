# Arborisis Discord Bot

<p align="center">
  <img src="https://raw.githubusercontent.com/Arborisis/.github/main/profile/logo.svg" alt="Arborisis Logo" width="150" />
</p>

<p align="center">
  <em>Bot Discord officiel de la plateforme Arborisis.</em>
</p>

<p align="center">
  <a href="https://github.com/Arborisis/discord-bot/actions"><img src="https://img.shields.io/github/actions/workflow/status/Arborisis/discord-bot/ci.yml?branch=main&style=flat-square&label=CI" alt="CI" /></a>
  <a href="https://github.com/Arborisis/discord-bot/blob/main/LICENSE"><img src="https://img.shields.io/github/license/Arborisis/discord-bot?style=flat-square" alt="License" /></a>
</p>

---

## Overview

Bot Discord Node.js pour la communaute Arborisis. Il fournit des commandes interactives pour rechercher des sons, consulter des profils, ecouter la radio, et interagir avec la plateforme directement depuis Discord.

### Commandes disponibles

- `/son` - Rechercher et ecouter des sons de la nature
- `/profil` - Consulter son profil et statistiques
- `/radio` - Ecouter la radio Arborisis en vocal
- `/donate` - Faire un don ECHO a un createur
- `/wallet` - Consulter son portefeuille ECHO
- `/stats` - Statistiques de la plateforme
- `/link` - Lier son compte Discord a Arborisis
- `/ping` - Verifier la latence du bot

## Architecture

```
discord-bot/
├── src/
│   ├── commands/          # Commandes slash Discord
│   ├── events/            # Gestionnaires d'evenements
│   ├── services/          # Services metier
│   │   ├── api.js         # Client API interne Laravel
│   │   ├── voiceRadio.js  # Streaming audio vocal
│   │   └── notifications.js # Notifications push
│   └── utils/             # Utilitaires
├── Dockerfile             # Image Docker de production
└── ecosystem.config.js    # Configuration PM2
```

## Stack technique

- **Node.js 22**
- **Discord.js** - Librairie Discord
- **@discordjs/voice** - Streaming audio
- **Axios** - Client HTTP pour l'API interne
- **PM2** - Process manager en production

## Installation

```bash
git clone https://github.com/Arborisis/discord-bot.git
cd discord-bot

# Installation
npm install

# Configuration
cp .env.example .env
# Editer .env avec les tokens et URLs
```

### Variables d'environnement

```env
DISCORD_TOKEN=              # Token du bot Discord
DISCORD_CLIENT_ID=          # ID de l'application
DISCORD_GUILD_ID=           # ID du serveur (dev)
DISCORD_INTERNAL_API_TOKEN= # Token API interne Laravel
LARAVEL_API_URL=            # URL de l'API Laravel
RADIO_STREAM_URL=           # URL du flux radio
```

## Developpement

```bash
# Mode developpement
npm run dev

# Lint
npm run lint

# Build production
npm run build
```

## Deploiement

### Docker

```bash
docker build -t arborisis-discord-bot .
docker run -d --env-file .env --name discord-bot arborisis-discord-bot
```

### Manuel avec PM2

```bash
npm install
npm run build
pm2 start ecosystem.config.js
```

## Securite

- **OAuth Discord** via `laravel/socialite` avec fallback par code temporaire
- **Tokens OAuth chiffres** en base avec cast `encrypted:`
- **Intents minimaux** : Guilds, GuildMembers, GuildMessages, DirectMessages
- **API interne securisee** par token Bearer

## Communication avec Laravel

Le bot communique avec l'application Laravel via une API interne securisee :

```
Discord Bot <-> API interne Laravel
  - Authentification par token
  - Endpoints dedies pour les commandes
  - Webhooks pour les notifications
```

## License

[MIT License](LICENSE)
