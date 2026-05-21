const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { api } = require('../services/api');
const { COLORS } = require('../utils/embedBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('link')
    .setDescription('Lie votre compte Discord à Arborisis')
    .addStringOption(option =>
      option.setName('code')
        .setDescription('Code de liaison reçu sur le site')
        .setRequired(false)
        .setMaxLength(6)
    ),

  async execute(interaction) {
    const code = interaction.options.getString('code');

    if (!code) {
      const embed = new EmbedBuilder()
        .setTitle('🔗 Liaison de compte')
        .setDescription(
          'Pour lier votre compte Discord à Arborisis :\n\n' +
          '1. Connectez-vous sur [Arborisis](https://arborisis.com)\n' +
          '2. Allez dans votre profil → Discord\n' +
          '3. Cliquez sur « Connecter Discord »\n\n' +
          'Ou utilisez `/link <code>` si vous avez généré un code sur le site.'
        )
        .setColor(COLORS.info)
        .setTimestamp();

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const { data } = await api.post('/internal/discord/link', {
        code: code.toUpperCase(),
        discord_id: interaction.user.id,
        discord_username: interaction.user.username,
        discord_avatar: interaction.user.avatar,
      });

      await interaction.editReply({ content: `✅ Compte lié avec succès à **${data.user_name}** !` });
    } catch (error) {
      if (error.response?.status === 400) {
        await interaction.editReply({ content: '❌ Code invalide ou expiré.' });
      } else {
        console.error('[Command:link]', error);
        await interaction.editReply({ content: '❌ Erreur lors de la liaison du compte.' });
      }
    }
  },
};
