const express = require('express');
const { z } = require('zod');
const rateLimit = require('express-rate-limit');
const { pool } = require('../db');
const { AppError } = require('../errors');
const { requireAuth, requireRole } = require('../middleware/auth');
const { placeBid } = require('../services/bidService');
const { parse, parseId } = require('../validate');

const router = express.Router();

const STATUS_MAP = { live: 'live', upcoming: 'scheduled', ended: 'ended' };
const SORTS = {
  ending_soon: 'a.ends_at ASC',
  price_asc: 'a.current_price ASC',
  price_desc: 'a.current_price DESC',
};

const listQuery = z.object({
  status: z.enum(['live', 'upcoming', 'ended']).default('live'),
  sort: z.enum(['ending_soon', 'price_asc', 'price_desc']).default('ending_soon'),
});

const createSchema = z
  .object({
    bikeId: z.coerce.number().int().positive(),
    startingPrice: z.coerce.number().positive().max(100000000),
    minIncrement: z.coerce.number().positive().max(10000000).default(500),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
  })
  .refine((d) => d.endsAt > d.startsAt, {
    message: 'End time must be after the start time',
    path: ['endsAt'],
  });

const bidSchema = z.object({
  amount: z.coerce.number().positive().max(1000000000),
  requestId: z.string().uuid(),
});

const bidLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => String(req.user.id),
  message: { error: { code: 'RATE_LIMITED', message: 'You are bidding too fast. Please slow down.' } },
});

function maskName(name) {
  const parts = String(name).trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0];
}

function auctionDto(r) {
  const price = Number(r.current_price);
  return {
    id: r.id,
    status: r.status,
    bike: {
      id: r.bike_id,
      make: r.make,
      model: r.model,
      year: r.year,
      mileageKm: r.mileage_km,
      imageUrl: r.image_url,
      conditionNotes: r.condition_notes ?? null,
    },
    startingPrice: Number(r.starting_price),
    minIncrement: Number(r.min_increment),
    currentPrice: price,
    minNextBid: r.highest_bidder_id ? price + Number(r.min_increment) : Number(r.starting_price),
    highestBidderId: r.highest_bidder_id ? Number(r.highest_bidder_id) : null,
    bidCount: Number(r.bid_count ?? 0),
    startsAt: r.starts_at,
    endsAt: r.ends_at,
  };
}

const BASE_SELECT = `
  SELECT a.*, b.make, b.model, b.year, b.mileage_km, b.image_url, b.condition_notes,
         (SELECT COUNT(*) FROM bids WHERE auction_id = a.id) AS bid_count
  FROM auctions a JOIN bikes b ON b.id = a.bike_id`;

// List auctions (public)
router.get('/', async (req, res) => {
  const q = parse(listQuery, req.query);
  const order = q.status === 'ended' ? 'a.ends_at DESC' : SORTS[q.sort];
  const [rows] = await pool.query(`${BASE_SELECT} WHERE a.status = ? ORDER BY ${order} LIMIT 100`, [
    STATUS_MAP[q.status],
  ]);
  const [counts] = await pool.query('SELECT status, COUNT(*) AS c FROM auctions GROUP BY status');
  const byStatus = Object.fromEntries(counts.map((c) => [c.status, Number(c.c)]));
  const [[{ now }]] = await pool.query('SELECT UTC_TIMESTAMP() AS now');
  res.json({
    serverTime: now,
    counts: { live: byStatus.live || 0, upcoming: byStatus.scheduled || 0, ended: byStatus.ended || 0 },
    auctions: rows.map(auctionDto),
  });
});

// Auction detail with recent bids (public)
router.get('/:id', async (req, res) => {
  const id = parseId(req.params.id);
  const [rows] = await pool.query(`${BASE_SELECT} WHERE a.id = ?`, [id]);
  if (!rows[0]) throw new AppError(404, 'AUCTION_NOT_FOUND', 'Auction not found.');
  const [bids] = await pool.query(
    `SELECT bd.id, bd.amount, bd.created_at, bd.user_id, u.name
     FROM bids bd JOIN users u ON u.id = bd.user_id
     WHERE bd.auction_id = ? ORDER BY bd.amount DESC LIMIT 20`,
    [id]
  );
  const [[{ now }]] = await pool.query('SELECT UTC_TIMESTAMP() AS now');
  res.json({
    serverTime: now,
    auction: auctionDto(rows[0]),
    bids: bids.map((b) => ({
      id: b.id,
      userId: Number(b.user_id),
      bidder: maskName(b.name),
      amount: Number(b.amount),
      createdAt: b.created_at,
    })),
  });
});

// Place a bid (any signed-in user)
router.post('/:id/bids', requireAuth, bidLimiter, async (req, res) => {
  const auctionId = parseId(req.params.id);
  const { amount, requestId } = parse(bidSchema, req.body);
  const result = await placeBid({ auctionId, userId: req.user.id, amount, requestId });
  req.log.info({ auctionId, userId: req.user.id, amount, duplicate: result.duplicate }, 'bid processed');
  res.status(result.duplicate ? 200 : 201).json(result);
});

// Create an auction (admin)
router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  const d = parse(createSchema, req.body);
  try {
    const [result] = await pool.query(
      `INSERT INTO auctions (bike_id, starting_price, min_increment, current_price, status, starts_at, ends_at)
       VALUES (?, ?, ?, ?, 'scheduled', ?, ?)`,
      [d.bikeId, d.startingPrice, d.minIncrement, d.startingPrice, d.startsAt, d.endsAt]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
      throw new AppError(404, 'BIKE_NOT_FOUND', 'That bike does not exist.');
    }
    throw err;
  }
});

// Cancel an auction (admin)
router.patch('/:id/cancel', requireAuth, requireRole('admin'), async (req, res) => {
  const id = parseId(req.params.id);
  const [result] = await pool.query(
    "UPDATE auctions SET status = 'cancelled' WHERE id = ? AND status IN ('scheduled','live')",
    [id]
  );
  if (!result.affectedRows) {
    throw new AppError(409, 'CANNOT_CANCEL', 'Only scheduled or live auctions can be cancelled.');
  }
  res.json({ id, status: 'cancelled' });
});

module.exports = router;