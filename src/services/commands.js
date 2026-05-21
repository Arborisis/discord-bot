const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('../config');

const commands = [];
const commandsPath = path.join(__dirname, '..', 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if ('data' in command && 'execute' in command) {
    commands.push(command.data.toJSON());
  } else {
    console.warn(`[Commands] Le fichier ${file} manque data ou execute.`);
  }
}

async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(config.discord.token);
  try {
    console.log(`[Commands] Déploiement de ${commands.length} commande(s)…`);
    await rest.put(
      Routes.applicationGuildCommands(config.discord.clientId, config.discord.guildId),
      { body: commands },
    );
    console.log('[Commands] Déploiement réussi.');
  } catch (error) {
    console.error('[Commands] Erreur de déploiement :', error);
  }
}

module.exports = { registerCommands, commands };
