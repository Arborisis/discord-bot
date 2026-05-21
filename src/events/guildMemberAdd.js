const { Events } = require('discord.js');

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member) {
    // Message de bienvenue personnalisé (optionnel, peut être désactivé via settings)
    // Pour l'instant, on laisse la gestion des bienvenues à Laravel via notifications
    console.log(`[GuildMemberAdd] ${member.user.tag} a rejoint le serveur.`);
  },
};
