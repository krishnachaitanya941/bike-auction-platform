const bcrypt = require('bcryptjs');
const { pool } = require('./db');
require('./config');

(async () => {
  try {
    if (!process.env.ADMIN_SEED_PASSWORD) {
      throw new Error('Missing required environment variable: ADMIN_SEED_PASSWORD');
    }

    const users = [
      {
        name: 'RevBid Admin',
        email: 'admin@revbid.com',
        password: process.env.ADMIN_SEED_PASSWORD,
        role: 'admin',
      },
      { name: 'Demo Bidder', email: 'demo@revbid.com', password: 'Demo@12345', role: 'user' },
    ];

    for (const u of users) {
      const hash = await bcrypt.hash(u.password, 12);
      await pool.query(
        `INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), name = VALUES(name), role = VALUES(role)`,
        [u.email, hash, u.name, u.role]
      );
      console.log(`Seeded ${u.role}: ${u.email}`);
    }
  } finally {
    await pool.end();
  }
})().catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  });