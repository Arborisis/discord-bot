const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { api } = require('../services/api');
const { COLORS } = require('../utils/embedBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('son')
    .setDescription('Affiche les détails d\'un son')
    .addStringOption(option =>
      option.setName('id')
        .setDescription('ID ou slug du son')
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const id = interaction.options.getString('id');

    try {
      const { data } = await api.get(`/internal/discord/sounds/${id}`);

      const embed = new EmbedBuilder()
        .setTitle(`🌿 ${data.title}`)
        .setURL(`https://arborisis.com/sounds/${data.slug}`)
        .setDescription(data.description || 'Aucune description')
        .setColor(COLORS.primary)
        .addFields(
          { name: 'Créateur', value: data.user.name, inline: true },
          { name: 'Durée', value: data.duration ? `${Math.floor(data.duration / 60)}:${String(data.duration % 60).padStart(2, '0')}` : 'N/A', inline: true },
          { name: 'Licence', value: data.license || 'N/A', inline: true },
          { name: 'Catégorie', value: data.category || 'N/A', inline: true },
          { name: 'Tags', value: data.tags?.length ? data.tags.join(', ') : 'Aucun', inline: false },
        )
        .setImage(data.cover_image ? `https://arborisis.com/storage/${data.cover_image}` : null)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      if (error.response?.status === 404) {
        await interaction.editReply({ content: '🔍 Son introuvable.' });
      } else {
        console.error('[Command:son]', error);
        await interaction.editReply({ content: '❌ Erreur lors de la récupération du son.' });
      }
    }
  },
};
