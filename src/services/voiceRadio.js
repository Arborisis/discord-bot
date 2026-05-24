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
const config = require('../config');

const player = createAudioPlayer({
  behaviors: {
    noSubscriber: NoSubscriberBehavior.Play,
  },
});

let activeConnection = null;
let activeChannelId = null;
let reconnectTimer = null;
let currentFfmpeg = null;
let healthCheckTimer = null;
let idleRestartTimer = null;
let consecutiveFailures = 0;
const MAX_RETRIES = 10;
const BASE_RETRY_DELAY_MS = 2000;

function createRadioResource() {
  if (healthCheckTimer) {
    clearTimeout(healthCheckTimer);
    healthCheckTimer = null;
  }

  if (currentFfmpeg) {
    const oldFfmpeg = currentFfmpeg;
    currentFfmpeg = null;
    oldFfmpeg.removeAllListeners();
    oldFfmpeg.kill('SIGTERM');
    setTimeout(() => {
      if (!oldFfmpeg.killed) {
        oldFfmpeg.kill('SIGKILL');
      }
    }, 2000);
  }

  const ffmpeg = spawn(config.radio.ffmpegPath, [
    '-hide_banner',
    '-loglevel', 'error',
    '-err_detect', 'ignore_err',
    '-fflags', '+discardcorrupt+genpts',
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

  ffmpeg.stderr.on('data', (chunk) => {
    const message = chunk.toString().trim();
    if (message) {
      console.error('[RadioVoice:ffmpeg]', message);
    }
  });

  ffmpeg.on('error', (err) => {
    console.error('[RadioVoice] FFmpeg process error:', err.message);
  });

  ffmpeg.on('close', (code, signal) => {
    if (currentFfmpeg === ffmpeg) {
      currentFfmpeg = null;
    }
    if (code !== 0 && activeChannelId) {
      console.error(`[RadioVoice] FFmpeg exited with code ${code} signal ${signal}`);
    }
  });

  healthCheckTimer = setTimeout(() => {
    if (currentFfmpeg === ffmpeg && player.state.status !== AudioPlayerStatus.Playing && player.state.status !== AudioPlayerStatus.Buffering && activeChannelId) {
      console.warn('[RadioVoice] Health check failed — stream not playing after 15s, restarting');
      ffmpeg.kill('SIGKILL');
    }
  }, 15000);

  return createAudioResource(ffmpeg.stdout, {
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
  if (currentFfmpeg) {
    currentFfmpeg.kill('SIGKILL');
    currentFfmpeg = null;
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
