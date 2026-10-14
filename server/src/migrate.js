const { pool } = require('./db');

const statements = [
  `CREATE TABLE IF NOT EXISTS users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    role ENUM('user','admin') NOT NULL DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS bikes (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    make VARCHAR(80) NOT NULL,
    model VARCHAR(80) NOT NULL,
    year SMALLINT NOT NULL,
    mileage_km INT NOT NULL,
    condition_notes TEXT,
    image_url VARCHAR(500)
  )`,
  `CREATE TABLE IF NOT EXISTS auctions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    bike_id BIGINT NOT NULL,
    starting_price DECIMAL(12,2) NOT NULL,
    min_increment DECIMAL(12,2) NOT NULL DEFAULT 500,
    current_price DECIMAL(12,2) NOT NULL,
    highest_bidder_id BIGINT NULL,
    status ENUM('scheduled','live','ended','cancelled') NOT NULL DEFAULT 'scheduled',
    starts_at DATETIME NOT NULL,
    ends_at DATETIME NOT NULL,
    version INT NOT NULL DEFAULT 0,
    FOREIGN KEY (bike_id) REFERENCES bikes(id),
    FOREIGN KEY (highest_bidder_id) REFERENCES users(id),
    INDEX idx_status_ends (status, ends_at)
  )`,
  `CREATE TABLE IF NOT EXISTS bids (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    auction_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    request_id CHAR(36) NOT NULL,
    response_json JSON NULL,
    created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE KEY uq_request (user_id, request_id),
    INDEX idx_auction_amount (auction_id, amount),
    FOREIGN KEY (auction_id) REFERENCES auctions(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`,
];

async function ensureResponseSnapshotColumn() {
  const [columns] = await pool.query(
    `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bids' AND COLUMN_NAME = 'response_json'`
  );
  if (!columns.length) {
    await pool.query('ALTER TABLE bids ADD COLUMN response_json JSON NULL');
  }
}

async function migrate() {
  for (const sql of statements) {
    await pool.query(sql);
  }
  await ensureResponseSnapshotColumn();
  const [tables] = await pool.query('SHOW TABLES');
  console.log('Tables:', tables.map((t) => Object.values(t)[0]).join(', '));
}

if (require.main === module) {
  (async () => {
    let failed = false;
    try {
      await migrate();
    } catch (err) {
      console.error('Migration failed:', err.message);
      failed = true;
    }
    try {
      await pool.end();
    } catch (err) {
      console.error('Failed to close database pool:', err.message);
      failed = true;
    }
    if (failed) process.exitCode = 1;
  })();
}

module.exports = { statements, migrate, ensureResponseSnapshotColumn };