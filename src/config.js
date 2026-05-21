require('dotenv').config();

module.exports = {
  discord: {
    token: process.env.DISCORD_BOT_TOKEN,
    clientId: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    guildId: process.env.DISCORD_GUILD_ID,
    radioVoiceChannelId: process.env.DISCORD_RADIO_VOICE_CHANNEL_ID,
    radioAutoJoin: process.env.DISCORD_RADIO_AUTO_JOIN !== 'false',
  },
  radio: {
    streamUrl: process.env.RADIO_STREAM_URL || process.env.RADIO_PUBLIC_STREAM_URL || 'https://arborisis.com/radio/stream',
    textChannelId: process.env.DISCORD_RADIO_TEXT_CHANNEL_ID,
    embedColor: parseInt(process.env.DISCORD_RADIO_EMBED_COLOR || '2F7D5C', 16),
    syncIntervalMs: parseInt(process.env.DISCORD_RADIO_SYNC_INTERVAL_MS || '10000', 10),
    ffmpegPath: process.env.FFMPEG_PATH || 'ffmpeg',
  },
  api: {
    port: parseInt(process.env.BOT_PORT || '3001', 10),
    host: process.env.BOT_HOST || '127.0.0.1',
    laravelUrl: process.env.LARAVEL_API_URL || 'http://localhost/api',
    laravelToken: process.env.LARAVEL_INTERNAL_TOKEN,
  },
};
