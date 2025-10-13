import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbFile = path.join(__dirname, '..', '..', 'data', 'telegram-logs.sqlite');
const dir = path.dirname(dbFile);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

let SQL; // the loaded sql.js module
let db;

// Initialize the DB and create tables if needed
export async function initDb() {
  if (db) return;
  // Resolve the wasm file that ships with sql.js so initSqlJs can load it in Node
  const require = createRequire(import.meta.url);
  const wasmFile = require.resolve('sql.js/dist/sql-wasm.wasm');
  SQL = await initSqlJs({ locateFile: () => wasmFile });

  // Load existing DB file if present
  if (fs.existsSync(dbFile)) {
    const filebuffer = fs.readFileSync(dbFile);
    db = new SQL.Database(filebuffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      first_name TEXT,
      last_name TEXT
    );

    CREATE TABLE IF NOT EXISTS actions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      menu TEXT,
      ts TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(user_id) REFERENCES users(id)
    );
  `);

  // persist initial DB
  persist();
}

function persist() {
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbFile, buffer);
  } catch (e) {
    // ignore write errors per original behavior
  }
}

export function upsertUser({ id, first_name, last_name }) {
  try {
    if (!db) return;
    const stmt = db.prepare(`INSERT INTO users (id, first_name, last_name) VALUES (:id, :first_name, :last_name)
      ON CONFLICT(id) DO UPDATE SET first_name=excluded.first_name, last_name=excluded.last_name;`);
    stmt.bind({ ':id': id, ':first_name': first_name || null, ':last_name': last_name || null });
    stmt.step();
    stmt.free();
    persist();
  } catch (e) {
    // silent
  }
}

export function insertAction(user_id, menu) {
  try {
    if (!db) return;
    const stmt = db.prepare(`INSERT INTO actions (user_id, menu) VALUES (:user_id, :menu)`);
    stmt.bind({ ':user_id': user_id || null, ':menu': menu || null });
    stmt.step();
    stmt.free();
    persist();
  } catch (e) {
    // silent
  }
}

export default {
  initDb,
  upsertUser,
  insertAction,
};
