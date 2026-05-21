const { buildNotificationEmbed } = require('../utils/embedBuilder');
const { client } = require('../client');

/**
 * Envoyer un embed dans un salon Discord
 */
async function sendChannelEmbed(channelId, title, description, color = 'primary') {
  const channel = await client.channels.fetch(channelId);
  if (!channel || !channel.isTextBased()) return false;

  const embed = buildNotificationEmbed(title, description, color);
  await channel.send({ embeds: [embed] });
  return true;
}

/**
 * Envoyer un embed en DM
 */
async function sendDmEmbed(discordId, title, description, color = 'primary') {
  const user = await client.users.fetch(discordId);
  if (!user) return false;

  const embed = buildNotificationEmbed(title, description, color);
  await user.send({ embeds: [embed] });
  return true;
}

module.exports = {
  sendChannelEmbed,
  sendDmEmbed,
};
