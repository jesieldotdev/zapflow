module.exports = {
  apps: [
    {
      name: 'zapvio-backend',
      script: 'dist/index.js',
      cwd: '/root/zapvio/backend',
      node_args: '--require dotenv/config',
      env: {
        DOTENV_CONFIG_PATH: '/root/zapvio/backend/.env.local',
      },
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_restarts: 10,
      restart_delay: 3000,
    },
  ],
};
