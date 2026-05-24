const { Shoukaku, Connectors } = require('shoukaku');
const config = require('../config');

let shoukaku = null;
let activePlayer = null;
let activeChannelId = null;
let reconnectTimer = null;

function getLavalinkConfig() {
  return {
    nodes: [{
      name: 'local',
      url: `${process.env.LAVALINK_HOST || 'localhost'}:${process.env.LAVALINK_PORT || 2333}`,
      auth: process.env.LAVALINK_PASSWORD || 'youshallnotpass',
    }],
    options: {
      moveOnDisconnect: false,
      resumable: false,
      resumableTimeout: 30,
      reconnectTries: 5,
      reconnectInterval: 5000,
      restTimeout: 10000,
    },
  };
}

async function initLavalink(client) {
  const { nodes, options } = getLavalinkConfig();
  shoukaku = new Shoukaku(new Connectors.DiscordJS(client), nodes, options);

  shoukaku.on('ready', (name) => {
    console.log(`[Lavalink] Node ${name} ready`);
  });

  shoukaku.on('error', (name, error) => {
    console.error(`[Lavalink] Node ${name} error:`, error.message || error);
  });

  shoukaku.on('close', (name, code, reason) => {
    console.warn(`[Lavalink] Node ${name} closed: ${code} ${reason}`);
  });

  shoukaku.on('disconnect', (name, players, moved) => {
    console.warn(`[Lavalink] Node ${name} disconnected, ${players.length} players affected`);
  });

  // Attendre que Lavalink soit prêt
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Lavalink connection timeout'));
    }, 60000);

    shoukaku.once('ready', () => {
      clearTimeout(timeout);
      resolve();
    });

    shoukaku.once('error', (name, error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

async function joinChannel(guildId, channelId) {
  if (!shoukaku) {
    throw new Error('Lavalink not initialized');
  }

  // Quitter le salon actuel si différent
  if (activePlayer && activeChannelId && activeChannelId !== channelId) {
    await leaveChannel();
  }

  activeChannelId = channelId;
  activePlayer = await shoukaku.joinVoiceChannel({
    guildId,
    channelId,
    shardId: 0,
  });

  activePlayer.on('update', (data) => {
    console.log('[Lavalink] Player update:', data.state);
  });

  activePlayer.on('exception', (error) => {
    console.error('[Lavalink] Player exception:', error);
  });

  activePlayer.on('closed', (reason) => {
    console.warn('[Lavalink] Player closed:', reason);
    activePlayer = null;
    activeChannelId = null;
  });

  console.log(`[RadioVoice] Joined voice channel ${channelId}`);
  return activePlayer;
}

async function playRadio() {
  if (!activePlayer) {
    throw new Error('Not connected to a voice channel');
  }

  const streamUrl = config.radio.streamUrl;
  console.log(`[RadioVoice] Playing radio stream: ${streamUrl}`);

  try {
    // Pour les streams HTTP directs, on utilise loadTracks puis playTrack
    const result = await shoukaku.rest.loadTracks(streamUrl);
    
    if (result.loadType === 'error') {
      throw new Error(`Failed to load track: ${result.data?.message || 'Unknown error'}`);
    }

    let track;
    if (result.loadType === 'track') {
      track = result.data;
    } else if (result.loadType === 'search' || result.loadType === 'playlist') {
      track = result.data[0];
    } else {
      // Pour les streams qui ne sont pas reconnus comme pistes,
      // on utilise playTrack avec l'URL directement
      await activePlayer.playTrack({
        track: streamUrl,
        options: {
          noReplace: false,
        },
      });
      console.log('[RadioVoice] Radio stream started');
      return;
    }

    await activePlayer.playTrack({
      track: track.encoded,
      options: {
        noReplace: false,
      },
    });
    console.log('[RadioVoice] Radio stream started');
  } catch (error) {
    console.error('[RadioVoice] Failed to play radio:', error);
    throw error;
  }
}

async function leaveChannel() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  if (activePlayer) {
    try {
      await activePlayer.destroyPlayer();
    } catch (e) {
      // Ignore
    }
    activePlayer = null;
  }

  activeChannelId = null;
  console.log('[RadioVoice] Left voice channel');
}

function status() {
  return {
    connected: Boolean(activePlayer),
    channelId: activeChannelId,
    streamUrl: config.radio.streamUrl,
    playerStatus: activePlayer ? 'connected' : 'disconnected',
  };
}

module.exports = {
  initLavalink,
  joinChannel,
  playRadio,
  leaveChannel,
  status,
};
