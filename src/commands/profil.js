const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { api } = require('../services/api');
const { COLORS } = require('../utils/embedBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('profil')
    .setDescription('Affiche le profil Arborisis lié')
    .addUserOption(option =>
      option.setName('utilisateur')
        .setDescription('Utilisateur Discord à consulter')
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const targetUser = interaction.options.getUser('utilisateur') || interaction.user;

    try {
      const { data } = await api.get(`/internal/discord/users/${targetUser.id}`);

      const embed = new EmbedBuilder()
        .setTitle(`🌿 Profil : ${data.user.name}`)
        .setURL(`https://arborisis.com/creators/${data.user.slug}`)
        .setColor(COLORS.primary)
        .addFields(
          { name: 'Rôle', value: data.user.role, inline: true },
          { name: 'ECHO', value: data.user.wallet_balance ? `${data.user.wallet_balance} ECHO` : '0 ECHO', inline: true },
        )
        .setThumbnail(data.discord.discord_avatar ? `https://cdn.discordapp.com/avatars/${targetUser.id}/${data.discord.discord_avatar}.png` : null)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      if (error.response?.status === 404) {
        await interaction.editReply({ content: `🔍 ${targetUser.username} n'a pas encore lié son compte Arborisis.` });
      } else {
        console.error('[Command:profil]', error);
        await interaction.editReply({ content: '❌ Impossible de récupérer le profil.' });
      }
    }
  },
};
