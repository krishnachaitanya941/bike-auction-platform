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

// In production the certificate comes from the DB_CA_CERT environment variable
// (the ca.pem file is not in Git). Locally it falls back to server/ca.pem.
function getCa() {
  if (process.env.DB_CA_CERT) {
    return process.env.DB_CA_CERT.replace(/\\n/g, '\n').trim();
  }
  return fs.readFileSync(path.join(__dirname, '..', 'ca.pem'), 'utf8');
}

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: useSsl ? { ca: getCa() } : undefined,
  connectionLimit: 10,
  timezone: 'Z',
});

module.exports = { pool };