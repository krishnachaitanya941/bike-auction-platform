const crypto = require('crypto');
const client = require('prom-client');

const register = new client.Registry();
register.setDefaultLabels({ app: 'revbid-api' });
client.collectDefaultMetrics({ register });

const httpDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [register],
});

const bidsTotal = new client.Counter({
  name: 'bids_total',
  help: 'Bid attempts by outcome',
  labelNames: ['outcome'],
  registers: [register],
});

const wsConnections = new client.Gauge({
  name: 'websocket_connections',
  help: 'Open websocket connections',
  registers: [register],
});

const schedulerTicks = new client.Counter({
  name: 'scheduler_ticks_total',
  help: 'Scheduler runs by result',
  labelNames: ['result'],
  registers: [register],
});

const auctionTransitions = new client.Counter({
  name: 'auction_transitions_total',
  help: 'Auctions moved to a new status by the scheduler',
  labelNames: ['to'],
  registers: [register],
});

// Label by route pattern (/api/auctions/:id), never by the raw URL, to keep cardinality low.
function routeLabel(req) {
  return req.route && req.route.path ? `${req.baseUrl || ''}${req.route.path}` : 'unmatched';
}

function metricsMiddleware(req, res, next) {
  if (req.path === '/metrics') return next();
  const end = httpDuration.startTimer();
  res.on('finish', () => end({ method: req.method, route: routeLabel(req), status: String(res.statusCode) }));
  next();
}

function tokenOk(header, token) {
  const expected = Buffer.from(`Bearer ${token}`);
  const given = Buffer.from(header || '');
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

async function metricsHandler(req, res) {
  const token = process.env.METRICS_TOKEN; // read per request so it can be set at runtime
  if (token && !tokenOk(req.headers.authorization, token)) {
    return res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Metrics token required.' } });
  }
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
}

module.exports = { metricsMiddleware, metricsHandler, bidsTotal, wsConnections, schedulerTicks, auctionTransitions };