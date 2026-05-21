const { client } = require('./client');
const config = require('./config');
const { startServer } = require('./server');
const { registerCommands } = require('./services/commands');
const fs = require('fs');
const path = require('path');
const { Collection } = require('discord.js');

// Collection des slash commands
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
  } else {
    console.warn(`[Commands] Le fichier ${file} manque data ou execute.`);
  }
}

// Charger les events handlers
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
}

// Login
client.login(config.discord.token)
  .then(() => {
    console.log('[Discord] Connexion en cours...');
    // Démarrer le serveur Express interne
    startServer();
    // Déployer les slash commands
    registerCommands();
  })
  .catch(err => {
    console.error('[Discord] Erreur de connexion :', err);
    process.exit(1);
  });
