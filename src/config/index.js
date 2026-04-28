import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Resolve o .env sempre a partir da raiz do projeto, independente do CWD
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../../.env') });

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
