module.exports = {
  apps: [
    {
      name: "myniyyah",
      script: "./.output/server/index.mjs",
      cwd: __dirname,
      interpreter: "node",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      listen_timeout: 10000,
      kill_timeout: 10000,
      exp_backoff_restart_delay: 1000,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
