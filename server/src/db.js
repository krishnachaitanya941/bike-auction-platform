require('./config');
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const useSsl = process.env.DB_SSL !== 'false';

if (
  process.env.NODE_ENV === 'test' &&
  (!['localhost', '127.0.0.1', '::1'].includes(process.env.DB_HOST?.toLowerCase()) ||
    process.env.DB_NAME !== 'bike_auction_test')
) {
  throw new Error('Test mode requires a local MySQL database named bike_auction_test.');
}

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: useSsl
    ? { ca: fs.readFileSync(path.join(__dirname, '..', 'ca.pem'), 'utf8') }
    : undefined,
  connectionLimit: 10,
  timezone: 'Z',
});

module.exports = { pool };