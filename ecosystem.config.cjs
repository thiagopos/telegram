module.exports = {
  apps: [{
    name: "telegramBOT",
    script: "./src/index.js",
    autorestart: true,
    watch: false,
    max_memory_restart: '64M',
    exp_backoff_restart_delay: 320000
  }]
}