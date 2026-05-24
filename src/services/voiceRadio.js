const {
  AudioPlayerStatus,
  VoiceConnectionStatus,
  createAudioPlayer,
  createAudioResource,
  entersState,
  getVoiceConnection,
  joinVoiceChannel,
  NoSubscriberBehavior,
  StreamType,
} = require('@discordjs/voice');
const { spawn } = require('child_process');
const { PassThrough } = require('stream');
const config = require('../config');

// Stream audio persistant qui ne se termine jamais
let audioPassThrough = null;
let currentFfmpeg = null;
let isShuttingDown = false;

// État du player
let activeConnection = null;
let activeChannelId = null;
let reconnectTimer = null;
let healthCheckTimer = null;
let idleRestartTimer = null;
let consecutiveFailures = 0;
const MAX_RETRIES = 10;
const BASE_RETRY_DELAY_MS = 2000;

const player = createAudioPlayer({
  behaviors: {
    noSubscriber: NoSubscriberBehavior.Play,
  },
});

function getAudioStream() {
  if (!audioPassThrough || audioPassThrough.destroyed) {
    audioPassThrough = new PassThrough();
    audioPassThrough.on('error', (err) => {
      console.error('[RadioVoice] PassThrough error:', err.message);
    });
  }
  return audioPassThrough;
}

function startFfmpeg() {
  if (isShuttingDown) return;
  if (currentFfmpeg && !currentFfmpeg.killed) {
    currentFfmpeg.removeAllListeners();
    currentFfmpeg.kill('SIGKILL');
  }

  const stream = getAudioStream();

  const ffmpeg = spawn(config.radio.ffmpegPath, [
    '-hide_banner',
    '-loglevel', 'error',
    '-reconnect', '1',
    '-reconnect_streamed', '1',
    '-reconnect_delay_max', '5',
    '-rw_timeout', '10000000',
    '-user_agent', 'Mozilla/5.0 (DiscordBot)',
    '-i', config.radio.streamUrl,
    '-vn',
    '-af', 'volume=0.85',
    '-ac', '2',
    '-ar', '48000',
    '-c:a', 'libopus',
    '-b:a', '96k',
    '-application', 'audio',
    '-f', 'ogg',
    'pipe:1',
  ], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  currentFfmpeg = ffmpeg;

  ffmpeg.stdout.pipe(stream, { end: false });

  ffmpeg.stderr.on('data', (chunk) => {
    const message = chunk.toString().trim();
    if (message) {
      console.error('[RadioVoice:ffmpeg]', message);
    }
  });

  ffmpeg.on('error', (err) => {
    if (!isShuttingDown) {
      console.error('[RadioVoice] FFmpeg error:', err.message);
      setTimeout(startFfmpeg, 500);
    }
  });

  ffmpeg.on('close', (code, signal) => {
    if (!isShuttingDown && activeChannelId) {
      console.error(`[RadioVoice] FFmpeg exited (${code}/${signal}), restarting...`);
      setTimeout(startFfmpeg, 500);
    }
  });

  console.log('[RadioVoice] FFmpeg started');
}

function stopFfmpeg() {
  isShuttingDown = true;
  if (currentFfmpeg && !currentFfmpeg.killed) {
    currentFfmpeg.removeAllListeners();
    currentFfmpeg.kill('SIGKILL');
    currentFfmpeg = null;
  }
}

function createRadioResource() {
  // Démarrer FFmpeg s'il n'est pas déjà en cours
  if (!currentFfmpeg || currentFfmpeg.killed) {
    isShuttingDown = false;
    startFfmpeg();
  }

  const stream = getAudioStream();

  // Health check - vérifie que FFmpeg est toujours en vie
  if (healthCheckTimer) clearTimeout(healthCheckTimer);
  healthCheckTimer = setTimeout(() => {
    if (activeChannelId && (!currentFfmpeg || currentFfmpeg.killed)) {
      console.warn('[RadioVoice] Health check failed — FFmpeg not running, restarting');
      startFfmpeg();
    }
  }, 15000);

  return createAudioResource(stream, {
    inputType: StreamType.OggOpus,
  });
}

function playStream() {
  if (idleRestartTimer) {
    clearTimeout(idleRestartTimer);
    idleRestartTimer = null;
  }

  const resource = createRadioResource();
  player.play(resource);
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

async function joinConfiguredChannel(client, channelId = config.discord.radioVoiceChannelId) {
  if (!channelId) {
    throw new Error('DISCORD_RADIO_VOICE_CHANNEL_ID is not configured');
  }

  const channel = await client.channels.fetch(channelId);
  if (!channel || !channel.isVoiceBased()) {
    throw new Error(`Channel ${channelId} is not a voice channel`);
  }

  const existing = getVoiceConnection(channel.guild.id);
  if (existing) {
    existing.destroy();
  }

  activeChannelId = channelId;
  activeConnection = joinVoiceChannel({
    channelId: channel.id,
    guildId: channel.guild.id,
    adapterCreator: channel.guild.voiceAdapterCreator,
    selfDeaf: true,
  });

  const subscription = activeConnection.subscribe(player);
  if (!subscription) {
    throw new Error('Discord voice player subscription failed');
  }

  activeConnection.on(VoiceConnectionStatus.Ready, () => {
    console.log('[RadioVoice] Voice connection ready');
  });

  activeConnection.on(VoiceConnectionStatus.Connecting, () => {
    console.log('[RadioVoice] Voice connection connecting');
  });

  activeConnection.on(VoiceConnectionStatus.Signalling, () => {
    console.log('[RadioVoice] Voice connection signalling');
  });

  activeConnection.on(VoiceConnectionStatus.Disconnected, async () => {
    try {
      await Promise.race([
        entersState(activeConnection, VoiceConnectionStatus.Signalling, 5000),
        entersState(activeConnection, VoiceConnectionStatus.Connecting, 5000),
      ]);
    } catch {
      activeConnection?.destroy();
      activeConnection = null;
      scheduleReconnect(client);
    }
  });

  activeConnection.on(VoiceConnectionStatus.Destroyed, () => {
    activeConnection = null;
  });

  playStream();

  return channel;
}

function leave() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (healthCheckTimer) {
    clearTimeout(healthCheckTimer);
    healthCheckTimer = null;
  }
  if (idleRestartTimer) {
    clearTimeout(idleRestartTimer);
    idleRestartTimer = null;
  }
  consecutiveFailures = 0;
  activeChannelId = null;
  player.stop(true);
  stopFfmpeg();
  if (audioPassThrough) {
    audioPassThrough.destroy();
    audioPassThrough = null;
  }
  activeConnection?.destroy();
  activeConnection = null;
}

async function reconnect(client) {
  const channelId = activeChannelId || config.discord.radioVoiceChannelId;
  leave();
  return joinConfiguredChannel(client, channelId);
}

function status() {
  return {
    connected: Boolean(activeConnection),
    channelId: activeChannelId,
    streamUrl: config.radio.streamUrl,
    playerStatus: player.state.status,
  };
}

player.on(AudioPlayerStatus.Idle, () => {
  console.warn('[RadioVoice] Player idle, restarting stream');
  if (!activeChannelId) return;

  if (idleRestartTimer) {
    clearTimeout(idleRestartTimer);
    idleRestartTimer = null;
  }

  consecutiveFailures++;

  if (consecutiveFailures > MAX_RETRIES) {
    console.error(`[RadioVoice] Max retries (${MAX_RETRIES}) exceeded — giving up on stream`);
    leave();
    return;
  }

  const delay = Math.min(BASE_RETRY_DELAY_MS * Math.pow(2, consecutiveFailures - 1), 60000);
  console.log(`[RadioVoice] Restarting stream in ${delay}ms (failure ${consecutiveFailures}/${MAX_RETRIES})`);

  idleRestartTimer = setTimeout(() => {
    idleRestartTimer = null;
    playStream();
  }, delay);
});

player.on(AudioPlayerStatus.Buffering, () => {
  console.log('[RadioVoice] Player buffering');
});

player.on(AudioPlayerStatus.Playing, () => {
  console.log('[RadioVoice] Player playing');
  if (consecutiveFailures > 0) {
    console.log(`[RadioVoice] Stream recovered after ${consecutiveFailures} failure(s)`);
    consecutiveFailures = 0;
  }
});

player.on('error', (error) => {
  console.error('[RadioVoice] Player error:', error);
  if (!activeChannelId) return;

  consecutiveFailures++;

  if (consecutiveFailures > MAX_RETRIES) {
    console.error(`[RadioVoice] Max retries (${MAX_RETRIES}) exceeded — giving up on stream`);
    leave();
    return;
  }

  const delay = Math.min(BASE_RETRY_DELAY_MS * Math.pow(2, consecutiveFailures - 1), 60000);
  console.log(`[RadioVoice] Restarting stream in ${delay}ms after player error (failure ${consecutiveFailures}/${MAX_RETRIES})`);

  setTimeout(playStream, delay);
});

module.exports = {
  joinConfiguredChannel,
  leave,
  reconnect,
  status,
};
