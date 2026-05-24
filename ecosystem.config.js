module.exports = {
  apps: [
    {
      name: 'lavalink',
      script: 'java',
      args: '-jar /app/Lavalink.jar',
      cwd: '/app',
      instances: 1,
      autorestart: true,
      max_memory_restart: '512M',
      env: {
        SERVER_PORT: 2333,
        LAVALINK_SERVER_PORT: 2333,
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/lavalink-err.log',
      out_file: './logs/lavalink-out.log',
      merge_logs: true,
    },
    {
      name: 'arborisis-discord-bot',
      script: './src/index.js',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        LAVALINK_HOST: 'localhost',
        LAVALINK_PORT: 2333,
        LAVALINK_PASSWORD: 'youshallnotpass',
      },
      env_development: {
        NODE_ENV: 'development',
        watch: true,
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      merge_logs: true,
    },
  ],
};
