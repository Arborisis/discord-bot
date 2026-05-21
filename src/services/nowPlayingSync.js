const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config');
const { api } = require('./api');

let lastHash = null;
let messageId = null;
let interval = null;

function payloadHash(payload) {
  return `${payload.sound_id || payload.slug || payload.title}:${payload.started_at || ''}`;
}

function buildEmbed(payload) {
  const embed = new EmbedBuilder()
    .setColor(config.radio.embedColor)
    .setTitle(payload.title || 'Arborisis Radio')
    .setDescription(payload.creator ? `par ${payload.creator}` : 'En direct sur Arborisis Radio')
    .addFields(
      { name: 'Format', value: payload.kind || 'sound', inline: true },
      { name: 'Durée', value: payload.duration || 'Direct', inline: true },
    )
    .setTimestamp(new Date());

  if (payload.url) embed.setURL(payload.url);
  if (payload.cover_url) embed.setThumbnail(payload.cover_url);

  return embed;
}

function buildButtons(payload) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel('Écouter')
      .setStyle(ButtonStyle.Link)
      .setURL(payload.radio_url || 'https://arborisis.com/radio'),
    new ButtonBuilder()
      .setLabel('Voir le son')
      .setStyle(ButtonStyle.Link)
      .setURL(payload.url || payload.radio_url || 'https://arborisis.com/radio')
      .setDisabled(!payload.url),
  );
}

async function syncOnce(client) {
  if (!config.radio.textChannelId) return;

  const channel = await client.channels.fetch(config.radio.textChannelId).catch(() => null);
  if (!channel || !channel.isTextBased()) return;

  const { data } = await api.get('/internal/discord/radio/now-playing');
  const hash = payloadHash(data);
  if (hash === lastHash && messageId) return;

  const payload = {
    embeds: [buildEmbed(data)],
    components: [buildButtons(data)],
  };

  let message = messageId ? await channel.messages.fetch(messageId).catch(() => null) : null;
  if (message) {
    await message.edit(payload);
  } else {
    message = await channel.send(payload);
    messageId = message.id;
  }

  lastHash = hash;
}

function start(client) {
  if (interval || !config.radio.textChannelId) return;

  syncOnce(client).catch(error => console.error('[RadioNowPlayingSync]', error.message));
  interval = setInterval(() => {
    syncOnce(client).catch(error => console.error('[RadioNowPlayingSync]', error.message));
  }, config.radio.syncIntervalMs);
}

module.exports = { start, syncOnce };
