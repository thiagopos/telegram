module.exports = {
  apps: [{
    name: "telegram",
    script: "./src/index.js",
    autorestart: true,
    watch: false,
    max_memory_restart: '128M',
    exp_backoff_restart_delay: 60000
  }]
}