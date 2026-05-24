const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { api } = require('../services/api');
const { COLORS } = require('../utils/embedBuilder');
const radioVoice = require('../services/voiceRadio');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('radio')
    .setDescription('Contrôle et affiche la radio Arborisis')
    .addSubcommand(subcommand => subcommand
      .setName('now')
      .setDescription('Affiche le titre en cours sur la radio Arborisis'))
    .addSubcommand(subcommand => subcommand
      .setName('join')
      .setDescription('Connecte la radio au salon vocal configuré'))
    .addSubcommand(subcommand => subcommand
      .setName('leave')
      .setDescription('Déconnecte la radio du salon vocal'))
    .addSubcommand(subcommand => subcommand
      .setName('reconnect')
      .setDescription('Reconnecte le stream radio vocal'))
    .addSubcommand(subcommand => subcommand
      .setName('status')
      .setDescription('Affiche l’état du stream vocal')),

  async execute(interaction) {
    await interaction.deferReply();
    const subcommand = interaction.options.getSubcommand() || 'now';

    if (subcommand === 'join') {
      try {
        const channel = await radioVoice.joinConfiguredChannel(interaction.client);
        await interaction.editReply({ content: `📻 Radio connectée dans **${channel.name}**.` });
      } catch (error) {
        console.error('[Command:radio join]', error);
        await interaction.editReply({ content: `❌ Impossible de connecter la radio : ${error.message}` });
      }
      return;
    }

    if (subcommand === 'leave') {
      await radioVoice.leave();
      await interaction.editReply({ content: '📻 Radio déconnectée du vocal.' });
      return;
    }

    if (subcommand === 'reconnect') {
      try {
        const channel = await radioVoice.reconnect(interaction.client);
        await interaction.editReply({ content: `📻 Radio reconnectée dans **${channel.name}**.` });
      } catch (error) {
        console.error('[Command:radio reconnect]', error);
        await interaction.editReply({ content: `❌ Impossible de reconnecter la radio : ${error.message}` });
      }
      return;
    }

    if (subcommand === 'status') {
      const status = radioVoice.status();
      await interaction.editReply({
        content: [
          `📻 Connecté : **${status.connected ? 'oui' : 'non'}**`,
          `Salon : **${status.channelId || 'non configuré'}**`,
          `Player : **${status.playerStatus}**`,
          `Flux : ${status.streamUrl}`,
        ].join('\n'),
      });
      return;
    }

    try {
      const { data } = await api.get('/internal/discord/radio/now-playing');

      const embed = new EmbedBuilder()
        .setTitle('📻 Radio Arborisis')
        .setDescription(`En cours : **${data.title || 'Inconnu'}**`)
        .setColor(COLORS.info)
        .addFields(
          { name: 'Créateur', value: data.creator || 'N/A', inline: true },
          { name: 'Durée', value: data.duration || 'N/A', inline: true },
        )
        .setURL('https://arborisis.com/radio')
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      if (error.response?.status === 404) {
        await interaction.editReply({ content: '📻 Aucune lecture en cours sur la radio.' });
      } else {
        console.error('[Command:radio]', error);
        await interaction.editReply({ content: '❌ Impossible de récupérer les infos radio.' });
      }
    }
  },
};
