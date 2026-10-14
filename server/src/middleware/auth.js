const jwt = require('jsonwebtoken');
const config = require('../config');
const { AppError } = require('../errors');

function requireAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    throw new AppError(401, 'UNAUTHENTICATED', 'Please sign in to continue.');
  }
  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch {
    throw new AppError(401, 'INVALID_TOKEN', 'Your session has expired. Please sign in again.');
  }
  req.user = { id: Number(payload.sub), role: payload.role };
  next();
}

function requireRole(role) {
  return (req, _res, next) => {
    if (!req.user || req.user.role !== role) {
      throw new AppError(403, 'FORBIDDEN', 'You do not have access to this resource.');
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };