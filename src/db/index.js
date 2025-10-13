import mysql from 'mysql2';
import { DB_HOST, DB_USER, DB_PASS, DB_NAME } from '../config/index.js';

// Create a connection pool
const pool = mysql.createPool({
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASS,
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export default pool.promise();
