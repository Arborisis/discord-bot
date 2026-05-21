const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { api } = require('../services/api');
const { COLORS } = require('../utils/embedBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('wallet')
    .setDescription('Affiche votre solde ECHO'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const { data } = await api.get(`/internal/discord/users/${interaction.user.id}`);

      const embed = new EmbedBuilder()
        .setTitle('💰 Portefeuille ECHO')
        .setDescription(`Solde actuel : **${data.user.wallet_balance ?? 0} ECHO**`)
        .setColor(COLORS.success)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      if (error.response?.status === 404) {
        await interaction.editReply({ content: '🔗 Vous devez d\'abord lier votre compte Arborisis via `/link`.' });
      } else {
        console.error('[Command:wallet]', error);
        await interaction.editReply({ content: '❌ Erreur lors de la récupération du solde.' });
      }
    }
  },
};
