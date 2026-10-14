const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const pinoHttp = require('pino-http');
const config = require('./config');
const logger = require('./logger');
const { pool } = require('./db');
const authRoutes = require('./routes/auth');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const bikeRoutes = require('./routes/bikes');
const auctionRoutes = require('./routes/auctions');
const app = express();
const adminRoutes = require('./routes/admin');
const { requestId } = require('./requestId');
const { metricsMiddleware, metricsHandler } = require('./metrics');

app.set('trust proxy', 1); // needed behind Render/Vercel proxies for correct client IPs
app.use(helmet());
app.use(cors({ origin: config.clientOrigin, credentials: true }));
app.use(express.json({ limit: '100kb' }));
app.use(requestId);
app.use(metricsMiddleware);
app.use(
  pinoHttp({
    logger,
    genReqId: (req) => req.id,
    autoLogging: { ignore: (req) => req.url === '/health' },
    serializers: {
      req: (req) => ({ id: req.id, method: req.method, url: req.url }),
      res: (res) => ({ statusCode: res.statusCode }),
    },
    customLogLevel: (_req, res, err) =>
      err || res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info',
  })
);

app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'up' });
  } catch {
    res.status(503).json({ status: 'degraded', db: 'down' });
  }
});
app.get('/metrics', metricsHandler);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many attempts. Try again in a few minutes.' } },
});
app.get('/', (_req, res) => res.json({ name: 'RevBid API', status: 'running' }));
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/bikes', bikeRoutes);
app.use('/api/auctions', auctionRoutes);
app.use('/api/admin', adminRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;