const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

if (process.env.NODE_ENV !== 'test') {
  throw new Error('Tests must run with NODE_ENV=test.');
}

const testEnvPath = path.join(__dirname, '..', '.env.test');
if (!fs.existsSync(testEnvPath)) {
  throw new Error('Missing server/.env.test. Copy .env.test.example and configure a local test database.');
}

dotenv.config({ path: testEnvPath, override: true });
process.env.NODE_ENV = 'test';

if (!['localhost', '127.0.0.1', '::1'].includes(process.env.DB_HOST?.toLowerCase())) {
  throw new Error('Tests refuse to run unless DB_HOST is localhost, 127.0.0.1, or ::1.');
}
if (process.env.DB_NAME !== 'bike_auction_test') {
  throw new Error('Tests refuse to modify any database other than bike_auction_test.');
}

const { pool } = require('../src/db');
const { statements, ensureResponseSnapshotColumn } = require('../src/migrate');

const tableNames = ['bids', 'auctions', 'bikes', 'users'];

beforeAll(async () => {
  for (const statement of statements) {
    await pool.query(statement);
  }
  await ensureResponseSnapshotColumn();
});

beforeEach(async () => {
  const connection = await pool.getConnection();
  try {
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const table of tableNames) {
      await connection.query(`TRUNCATE TABLE ${table}`);
    }
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
  } finally {
    connection.release();
  }
});

afterAll(async () => {
  await pool.end();
});
