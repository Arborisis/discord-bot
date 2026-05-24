const lavalink = require('./lavalink');
const config = require('../config');

let activeConnection = null;
let activeChannelId = null;
let reconnectTimer = null;
let consecutiveFailures = 0;
const MAX_RETRIES = 10;
const BASE_RETRY_DELAY_MS = 2000;

async function init(client) {
  await lavalink.initLavalink(client);
  console.log('[RadioVoice] Lavalink initialized');
}

async function joinConfiguredChannel(client, channelId = config.discord.radioVoiceChannelId) {
  if (!channelId) {
    throw new Error('DISCORD_RADIO_VOICE_CHANNEL_ID is not configured');
  }

  const channel = await client.channels.fetch(channelId);
  if (!channel || !channel.isVoiceBased()) {
    throw new Error(`Channel ${channelId} is not a voice channel`);
  }

  // Initialiser Lavalink si pas déjà fait
  if (!lavalink.status().connected) {
    await init(client);
  }

  activeChannelId = channelId;
  
  try {
    await lavalink.joinChannel(channel.guild.id, channelId);
    await lavalink.playRadio();
    console.log(`[RadioVoice] Streaming dans ${channel.name}`);
    consecutiveFailures = 0;
    return channel;
  } catch (error) {
    console.error('[RadioVoice] Failed to start stream:', error);
    throw error;
  }
}

function scheduleReconnect(client, delay = 5000) {
  if (reconnectTimer || !activeChannelId) return;

  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null;
    try {
      await joinConfiguredChannel(client, activeChannelId);
    } catch (error) {
      console.error('[RadioVoice] Reconnect failed:', error);
      scheduleReconnect(client, 15000);
    }
  }, delay);
}

async function leave() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  consecutiveFailures = 0;
  activeChannelId = null;
  await lavalink.leaveChannel();
}

async function reconnect(client) {
  const channelId = activeChannelId || config.discord.radioVoiceChannelId;
  await leave();
  return joinConfiguredChannel(client, channelId);
}

function status() {
  return {
    connected: Boolean(activeChannelId),
    channelId: activeChannelId,
    streamUrl: config.radio.streamUrl,
    playerStatus: lavalink.status().playerStatus,
  };
}

module.exports = {
  init,
  joinConfiguredChannel,
  leave,
  reconnect,
  status,
};
