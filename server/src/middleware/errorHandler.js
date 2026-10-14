const logger = require('../logger');

const DATABASE_CONNECTION_ERRORS = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'EHOSTUNREACH',
  'ENETUNREACH',
  'ENOTFOUND',
  'EAI_AGAIN',
  'PROTOCOL_CONNECTION_LOST',
  'PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR',
]);

function notFound(req, res) {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found`, requestId: req.id },
  });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  const requestId = req.id;
  if (err.status && err.code) {
    return res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details, requestId },
    });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'BAD_JSON', message: 'Invalid JSON body', requestId } });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body is too large.', requestId } });
  }
  if (DATABASE_CONNECTION_ERRORS.has(err.code)) {
    (req.log || logger).error(
      { requestId, databaseErrorCode: err.code },
      'database request failed'
    );
    return res.status(503).json({
      error: {
        code: 'DATABASE_UNAVAILABLE',
        message: 'The database is temporarily unavailable. Please try again shortly.',
        requestId,
      },
    });
  }
  (req.log || logger).error({ err, requestId, path: req.path }, 'unhandled error');
  res.status(500).json({
    error: { code: 'INTERNAL', message: 'Something went wrong. Please try again.', requestId },
  });
}

module.exports = { notFound, errorHandler };