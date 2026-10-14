const pino = require('pino');
const config = require('./config');

const logger = pino({
  level: config.env === 'production' ? 'info' : 'debug',
  redact: ['req.headers.authorization', 'password', 'password_hash'],
  transport:
    config.env === 'production'
      ? undefined
      : { target: 'pino-pretty', options: { colorize: true } },
});

module.exports = logger;