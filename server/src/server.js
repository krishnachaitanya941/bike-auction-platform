const config = require('./config');
const logger = require('./logger');
const app = require('./app');
const { pool } = require('./db');
const { startScheduler } = require('./scheduler');

const server = app.listen(config.port, () => {
  logger.info(`API listening on port ${config.port}`);
});
const stopScheduler = startScheduler();

async function shutdown(signal) {
  logger.info(`${signal} received, shutting down`);
  stopScheduler();
  server.close((serverError) => {
    if (serverError) {
      logger.error({ err: serverError }, 'server shutdown failed');
      process.exitCode = 1;
    }
    pool.end().catch((err) => {
      logger.error({ err }, 'database pool shutdown failed');
      process.exitCode = 1;
    });
  });
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));