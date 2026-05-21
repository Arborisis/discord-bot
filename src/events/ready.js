const { Events, ActivityType } = require('discord.js');
const config = require('../config');
const radioVoice = require('../services/voiceRadio');
const nowPlayingSync = require('../services/nowPlayingSync');

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    console.log(`[Discord] Connecté en tant que ${client.user.tag}`);
    client.user.setActivity('les sons de la nature', { type: ActivityType.Listening });

    if (config.discord.radioAutoJoin && config.discord.radioVoiceChannelId) {
      radioVoice.joinConfiguredChannel(client)
        .then(channel => console.log(`[RadioVoice] Streaming dans ${channel.name}`))
        .catch(error => console.error('[RadioVoice] Auto-join failed:', error));
    }

    nowPlayingSync.start(client);
  },
};
