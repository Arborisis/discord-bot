const { EmbedBuilder } = require('discord.js');

const COLORS = {
  primary: 0x2D5A3D,    // arbor-emerald
  success: 0x4ADE80,    // vert
  warning: 0xF59E0B,    // amber
  error: 0xEF4444,      // rouge
  info: 0x3B82F6,       // bleu
  dark: 0x1A1A1A,       // night
};

function baseEmbed() {
  return new EmbedBuilder()
    .setTimestamp()
    .setFooter({ text: 'Arborisis', iconURL: 'https://arborisis.com/favicon.ico' });
}

function buildSoundEmbed(sound, user) {
  return baseEmbed()
    .setTitle(`🌿 ${sound.title}`)
    .setURL(`https://arborisis.com/sounds/${sound.slug}`)
    .setDescription(sound.description || 'Aucune description')
    .setColor(COLORS.primary)
    .addFields(
      { name: 'Créateur', value: user?.name || 'Inconnu', inline: true },
      { name: 'Durée', value: sound.duration ? `${Math.floor(sound.duration / 60)}:${String(sound.duration % 60).padStart(2, '0')}` : 'N/A', inline: true },
      { name: 'Licence', value: sound.license || 'N/A', inline: true },
    )
    .setImage(sound.cover_image ? `https://arborisis.com/storage/${sound.cover_image}` : null);
}

function buildNotificationEmbed(title, description, color = 'primary') {
  return baseEmbed()
    .setTitle(title)
    .setDescription(description)
    .setColor(COLORS[color] || COLORS.primary);
}

module.exports = {
  baseEmbed,
  buildSoundEmbed,
  buildNotificationEmbed,
  COLORS,
};
