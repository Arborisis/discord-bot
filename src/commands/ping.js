const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Affiche la latence du bot'),

  async execute(interaction) {
    const sent = await interaction.reply({ content: 'Calcul…', fetchReply: true, ephemeral: true });
    const latency = sent.createdTimestamp - interaction.createdTimestamp;
    const apiLatency = Math.round(interaction.client.ws.ping);

    await interaction.editReply({
      content: `🏓 Pong !\n• Latence message : ${latency}ms\n• Latence API : ${apiLatency}ms`,
    });
  },
};
