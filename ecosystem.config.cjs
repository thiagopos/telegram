module.exports = {
  apps: [{
    name: "Telegram",
    script: "./src/index.js",
    autorestart: true,
    watch: false,
    max_memory_restart: '128M',
    exp_backoff_restart_delay: 5000
  }]
}