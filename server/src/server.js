const http = require('http');
const config = require('./config');
const logger = require('./logger');
const app = require('./app');
const { pool } = require('./db');
const { startScheduler } = require('./scheduler');
const { initRealtime, closeRealtime } = require('./realtime');

const server = http.createServer(app);
initRealtime(server);

server.listen(config.port, () => {
  logger.info(`API listening on port ${config.port}`);
});
const stopScheduler = startScheduler();

async function shutdown(signal) {
  logger.info(`${signal} received, shutting down`);
  stopScheduler();
  try {
    await closeRealtime(); // closes sockets and the HTTP server
    await pool.end();
    process.exit(0);
  } catch (err) {
    logger.error({ err }, 'shutdown failed');
    process.exit(1);
  }
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => logger.error({ err: reason }, 'unhandled promise rejection'));
process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'uncaught exception');
  process.exit(1);
});