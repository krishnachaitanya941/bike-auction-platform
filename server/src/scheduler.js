const { pool } = require('./db');
const logger = require('./logger');
const { publish } = require('./realtime');
const { schedulerTicks, auctionTransitions } = require('./metrics');

function announce(id, status) {
  const payload = { auctionId: id, status };
  publish(`auction:${id}`, 'auction:status', payload);
  publish('lobby', 'auction:status', payload);
}

async function tick() {
  const [toStart] = await pool.query(
    `SELECT id FROM auctions
     WHERE status = 'scheduled' AND starts_at <= UTC_TIMESTAMP() AND ends_at > UTC_TIMESTAMP()`
  );
  if (toStart.length) {
    const ids = toStart.map((r) => r.id);
    await pool.query(`UPDATE auctions SET status = 'live' WHERE id IN (?) AND status = 'scheduled'`, [ids]);
    ids.forEach((id) => announce(id, 'live'));
    auctionTransitions.inc({ to: 'live' }, ids.length);
    logger.info({ count: ids.length }, 'auctions started');
  }

  const [toEnd] = await pool.query(
    `SELECT id FROM auctions WHERE status IN ('scheduled','live') AND ends_at <= UTC_TIMESTAMP()`
  );
  if (toEnd.length) {
    const ids = toEnd.map((r) => r.id);
    await pool.query(`UPDATE auctions SET status = 'ended' WHERE id IN (?) AND status IN ('scheduled','live')`, [ids]);
    ids.forEach((id) => announce(id, 'ended'));
    auctionTransitions.inc({ to: 'ended' }, ids.length);
    logger.info({ count: ids.length }, 'auctions ended');
  }
}

function startScheduler(intervalMs = 2000) {
  const timer = setInterval(() => {
    tick()
      .then(() => schedulerTicks.inc({ result: 'ok' }))
      .catch((err) => {
        schedulerTicks.inc({ result: 'error' });
        logger.error({ err }, 'scheduler tick failed');
      });
  }, intervalMs);
  return () => clearInterval(timer);
}

module.exports = { startScheduler, tick };