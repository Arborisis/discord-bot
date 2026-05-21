const express = require('express');
const { client } = require('./client');
const config = require('./config');
const voiceRadio = require('./services/voiceRadio');

const app = express();
app.use(express.json());

/**
 * Healthcheck
 */
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    discord: client.isReady() ? 'ready' : 'connecting',
    radio: voiceRadio.status(),
  });
});

/**
 * Envoyer une notification dans un salon
 * Body: { channelId: string, content?: string, embed?: object, mentions?: string[] }
 */
app.post('/webhook/notification', async (req, res) => {
  try {
    const { channelId, content, embed, mentions } = req.body;
    if (!channelId) {
      return res.status(400).json({ error: 'channelId requis' });
    }

    const channel = await client.channels.fetch(channelId);
    if (!channel || !channel.isTextBased()) {
      return res.status(404).json({ error: 'Salon introuvable ou non textuel' });
    }

    const options = {};
    if (content) options.content = mentions?.length ? `${mentions.map(m => `<@${m}>`).join(' ')} ${content}` : content;
    if (embed) options.embeds = [embed];

    const message = await channel.send(options);
    return res.json({ success: true, messageId: message.id });
  } catch (error) {
    console.error('[Webhook Notification]', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * Envoyer une DM à un utilisateur
 * Body: { discordId: string, content?: string, embed?: object }
 */
app.post('/webhook/notification/user', async (req, res) => {
  try {
    const { discordId, content, embed } = req.body;
    if (!discordId) {
      return res.status(400).json({ error: 'discordId requis' });
    }

    const user = await client.users.fetch(discordId);
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }

    const options = {};
    if (content) options.content = content;
    if (embed) options.embeds = [embed];

    const message = await user.send(options);
    return res.json({ success: true, messageId: message.id });
  } catch (error) {
    console.error('[Webhook DM]', error);
    return res.status(500).json({ error: error.message });
  }
});

function startServer() {
  const { host, port } = config.api;
  app.listen(port, host, () => {
    console.log(`[Express] Serveur interne démarré sur http://${host}:${port}`);
  });
}

module.exports = { startServer };
