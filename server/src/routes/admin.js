const express = require('express');
const { pool } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth, requireRole('admin'));

router.get('/stats', async (_req, res) => {
  const [[s]] = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM auctions WHERE status = 'live') AS liveAuctions,
      (SELECT COUNT(*) FROM auctions WHERE status = 'scheduled') AS scheduledAuctions,
      (SELECT COUNT(*) FROM bids WHERE created_at >= UTC_DATE()) AS bidsToday,
      (SELECT COUNT(*) FROM bids) AS totalBids,
      (SELECT COUNT(*) FROM users) AS users,
      (SELECT COUNT(*) FROM auctions WHERE status = 'ended' AND highest_bidder_id IS NOT NULL) AS soldCount,
      (SELECT COALESCE(SUM(current_price), 0) FROM auctions
         WHERE status = 'ended' AND highest_bidder_id IS NOT NULL) AS salesValue
  `);
  res.json({
    liveAuctions: Number(s.liveAuctions),
    scheduledAuctions: Number(s.scheduledAuctions),
    bidsToday: Number(s.bidsToday),
    totalBids: Number(s.totalBids),
    users: Number(s.users),
    soldCount: Number(s.soldCount),
    salesValue: Number(s.salesValue),
  });
});

router.get('/auctions', async (_req, res) => {
  const [rows] = await pool.query(`
    SELECT a.id, a.status, a.starting_price, a.current_price, a.highest_bidder_id,
           a.starts_at, a.ends_at, b.make, b.model, b.image_url,
           (SELECT COUNT(*) FROM bids WHERE auction_id = a.id) AS bid_count
    FROM auctions a JOIN bikes b ON b.id = a.bike_id
    ORDER BY a.id DESC LIMIT 100`);
  res.json({
    auctions: rows.map((r) => ({
      id: r.id,
      status: r.status,
      bike: { make: r.make, model: r.model, imageUrl: r.image_url },
      startingPrice: Number(r.starting_price),
      currentPrice: Number(r.current_price),
      highestBidderId: r.highest_bidder_id ? Number(r.highest_bidder_id) : null,
      bidCount: Number(r.bid_count),
      startsAt: r.starts_at,
      endsAt: r.ends_at,
    })),
  });
});

module.exports = router;