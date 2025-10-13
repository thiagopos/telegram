import bot from './bot/bot.js';
import { initDb } from './db/sqlite.js';

(async () => {
  try {
    await initDb();
    await bot.launch();
  } catch (err) {
    console.error('Failed to launch bot:', err);
    process.exit(1);
  }
})();

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection at:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});
