import dotenv from 'dotenv';

// Load environment variables once for the whole app
dotenv.config();

export const BOT_TOKEN = process.env.BOT_TOKEN;
export const DB_HOST = process.env.DB_HOST;
export const DB_USER = process.env.DB_USER;
export const DB_PASS = process.env.DB_PASS;
export const DB_NAME = process.env.DB_NAME;

export default {
  BOT_TOKEN,
  DB_HOST,
  DB_USER,
  DB_PASS,
  DB_NAME,
};
