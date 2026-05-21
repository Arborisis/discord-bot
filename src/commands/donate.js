const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { api } = require('../services/api');
const { COLORS } = require('../utils/embedBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('donate')
    .setDescription('Envoyer des ECHO à un autre utilisateur lié')
    .addUserOption(option =>
      option.setName('utilisateur')
        .setDescription('Destinataire du don')
        .setRequired(true)
    )
    .addNumberOption(option =>
      option.setName('montant')
        .setDescription('Montant en ECHO')
        .setRequired(true)
        .setMinValue(0.01)
    )
    .addStringOption(option =>
      option.setName('message')
        .setDescription('Message accompagnant le don')
        .setRequired(false)
        .setMaxLength(500)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const target = interaction.options.getUser('utilisateur');
    const amount = interaction.options.getNumber('montant');
    const message = interaction.options.getString('message') || null;

    if (target.id === interaction.user.id) {
      return interaction.editReply({ content: '❌ Vous ne pouvez pas vous donner des ECHO à vous-même.' });
    }

    // TODO: implémenter l'appel API vers Laravel pour initier le don
    // Pour l'instant, on affiche un message indicatif
    const embed = new EmbedBuilder()
      .setTitle('💰 Don ECHO')
      .setDescription(`**${interaction.user.username}** souhaite donner **${amount} ECHO** à **${target.username}**.`)
      .setColor(COLORS.warning)
      .addFields(
        { name: 'Message', value: message || 'Aucun', inline: false },
        { name: 'Statut', value: '⏳ Fonctionnalité en cours d\'intégration. Utilisez le site pour le moment.', inline: false },
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
