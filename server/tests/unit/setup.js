const { randomBytes } = require('node:crypto');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = randomBytes(32).toString('hex');
process.env.DB_HOST = '127.0.0.1';
process.env.DB_PORT = '3306';
process.env.DB_USER = 'unit_test';
process.env.DB_PASSWORD = randomBytes(16).toString('hex');
process.env.DB_NAME = 'bike_auction_test';
process.env.DB_SSL = 'false';
