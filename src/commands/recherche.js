const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { api } = require('../services/api');
const { COLORS } = require('../utils/embedBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('recherche')
    .setDescription('Rechercher un son sur Arborisis')
    .addStringOption(option =>
      option.setName('query')
        .setDescription('Mots-clés de recherche')
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const query = interaction.options.getString('query');

    try {
      const { data } = await api.get('/internal/discord/sounds/search', { params: { q: query } });

      if (!data.length) {
        return interaction.editReply({ content: `🔍 Aucun résultat pour « ${query} ».` });
      }

      const embed = new EmbedBuilder()
        .setTitle(`🔍 Résultats pour « ${query} »`)
        .setColor(COLORS.info)
        .setDescription(data.map((sound, i) =>
          `${i + 1}. **[${sound.title}](https://arborisis.com/sounds/${sound.slug})** — ${sound.duration ? Math.floor(sound.duration / 60) + ':' + String(sound.duration % 60).padStart(2, '0') : 'N/A'}`
        ).join('\n'))
        .setFooter({ text: `${data.length} résultat(s)` })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('[Command:recherche]', error);
      await interaction.editReply({ content: '❌ Erreur lors de la recherche.' });
    }
  },
};
