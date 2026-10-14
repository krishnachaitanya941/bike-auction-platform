const { pool } = require('./db');
const logger = require('./logger');

async function tick() {
  const [started] = await pool.query(
    `UPDATE auctions SET status = 'live'
     WHERE status = 'scheduled' AND starts_at <= UTC_TIMESTAMP() AND ends_at > UTC_TIMESTAMP()`
  );
  const [ended] = await pool.query(
    `UPDATE auctions SET status = 'ended'
     WHERE status IN ('scheduled','live') AND ends_at <= UTC_TIMESTAMP()`
  );
  if (started.affectedRows) logger.info({ count: started.affectedRows }, 'auctions started');
  if (ended.affectedRows) logger.info({ count: ended.affectedRows }, 'auctions ended');
}

function startScheduler(intervalMs = 2000) {
  const timer = setInterval(() => {
    tick().catch((err) => logger.error({ err }, 'scheduler tick failed'));
  }, intervalMs);
  return () => clearInterval(timer);
}

module.exports = { startScheduler, tick };
