const path = require('path');

require('dotenv').config({
  path: process.env.NODE_ENV === 'test' ? path.join(__dirname, '..', '.env.test') : undefined,
});

const required = ['JWT_SECRET', 'DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

const clientOrigins = ['https://bike-auction-platform-phi.vercel.app'];
if (process.env.NODE_ENV !== 'production') {
  clientOrigins.push('http://localhost:8443', 'http://127.0.0.1:8443');
}

module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 4000,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
  clientOrigins,
};