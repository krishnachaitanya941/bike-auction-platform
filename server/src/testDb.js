const { pool } = require('./db');

(async () => {
  const [rows] = await pool.query('SELECT 1 + 1 AS result');
  console.log('Database connected! 1 + 1 =', rows[0].result);
  await pool.end();
})().catch((err) => {
  console.error('Connection failed:', err.message);
  process.exit(1);
});