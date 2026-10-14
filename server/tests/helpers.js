const bcrypt = require('bcryptjs');
const { randomUUID } = require('node:crypto');
const jwt = require('jsonwebtoken');
const { pool } = require('../src/db');
const config = require('../src/config');

async function createUser({ name = 'Test User', email, role = 'user' } = {}) {
  const uniqueEmail = email ?? `user-${randomUUID()}@example.test`;
  const passwordHash = await bcrypt.hash('TestPassword123', 4);
  const [result] = await pool.query(
    'INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)',
    [uniqueEmail, passwordHash, name, role]
  );
  const user = { id: result.insertId, name, email: uniqueEmail, role };
  const token = jwt.sign({ role }, config.jwtSecret, { subject: String(user.id) });
  return { ...user, token };
}

async function createBike(overrides = {}) {
  const bike = {
    make: 'Honda',
    model: 'CB500',
    year: 2022,
    mileageKm: 12000,
    conditionNotes: 'Well maintained',
    imageUrl: null,
    ...overrides,
  };
  const [result] = await pool.query(
    `INSERT INTO bikes (make, model, year, mileage_km, condition_notes, image_url)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [bike.make, bike.model, bike.year, bike.mileageKm, bike.conditionNotes, bike.imageUrl]
  );
  return { id: result.insertId, ...bike };
}

async function createAuction(bikeId, overrides = {}) {
  const now = Date.now();
  const auction = {
    startingPrice: 1000,
    minIncrement: 100,
    currentPrice: 1000,
    highestBidderId: null,
    status: 'live',
    startsAt: new Date(now - 60_000),
    endsAt: new Date(now + 120_000),
    ...overrides,
  };
  const [result] = await pool.query(
    `INSERT INTO auctions
       (bike_id, starting_price, min_increment, current_price, highest_bidder_id, status, starts_at, ends_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      bikeId,
      auction.startingPrice,
      auction.minIncrement,
      auction.currentPrice,
      auction.highestBidderId,
      auction.status,
      auction.startsAt,
      auction.endsAt,
    ]
  );
  return { id: result.insertId, ...auction };
}

module.exports = { pool, createUser, createBike, createAuction };
