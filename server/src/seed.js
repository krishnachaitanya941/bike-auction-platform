const bcrypt = require('bcryptjs');
const { pool } = require('./db');
require('./config');

const users = [
  { name: 'RevBid Admin', email: 'admin@revbid.com', password: 'Admin@12345', role: 'admin' },
  { name: 'Demo Bidder', email: 'demo@revbid.com', password: 'Demo@12345', role: 'user' },
];

(async () => {
  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 12);
    await pool.query(
      `INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), name = VALUES(name), role = VALUES(role)`,
      [u.email, hash, u.name, u.role]
    );
    console.log(`Seeded ${u.role}: ${u.email}`);
  }
  await pool.end();
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});