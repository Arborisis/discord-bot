const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { api } = require('../services/api');
const { baseEmbed, COLORS } = require('../utils/embedBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Affiche les statistiques publiques de la plateforme Arborisis'),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const { data } = await api.get('/internal/discord/stats');
      const embed = baseEmbed()
        .setTitle('📊 Statistiques Arborisis')
        .setColor(COLORS.info)
        .addFields(
          { name: 'Sons publiés', value: String(data.sounds_count ?? 'N/A'), inline: true },
          { name: 'Créateurs', value: String(data.creators_count ?? 'N/A'), inline: true },
          { name: 'Utilisateurs', value: String(data.users_count ?? 'N/A'), inline: true },
          { name: 'Transactions ECHO (24h)', value: String(data.transactions_24h ?? 'N/A'), inline: true },
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('[Command:stats]', error);
      await interaction.editReply({ content: '❌ Impossible de récupérer les statistiques pour le moment.' });
    }
  },
};
