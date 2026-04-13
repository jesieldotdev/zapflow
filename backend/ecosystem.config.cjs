module.exports = {
  apps: [
    {
      name: 'zapflow-backend',
      script: 'dist/index.js',
      cwd: '/root/zapflow/backend',
      node_args: '--require dotenv/config',
      env: {
        DOTENV_CONFIG_PATH: '/root/zapflow/backend/.env.local',
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
