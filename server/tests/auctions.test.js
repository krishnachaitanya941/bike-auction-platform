const request = require('supertest');
const app = require('../src/app');
const { createBike, createUser, createAuction } = require('./helpers');

describe('public auctions', () => {
  it('filters by status, sorts rows, and reports status counts', async () => {
    const bike = await createBike();
    const now = Date.now();
    const laterEnding = await createAuction(bike.id, {
      endsAt: new Date(now + 90_000),
      currentPrice: 1500,
    });
    const soonerEnding = await createAuction(bike.id, {
      endsAt: new Date(now + 60_000),
      currentPrice: 1200,
    });
    await createAuction(bike.id, {
      status: 'scheduled',
      startsAt: new Date(now + 60_000),
      endsAt: new Date(now + 120_000),
    });
    const latestEnded = await createAuction(bike.id, {
      status: 'ended',
      startsAt: new Date(now - 120_000),
      endsAt: new Date(now - 60_000),
    });
    const earlierEnded = await createAuction(bike.id, {
      status: 'ended',
      startsAt: new Date(now - 180_000),
      endsAt: new Date(now - 120_000),
    });

    const live = await request(app).get('/api/auctions?status=live&sort=ending_soon');
    const upcoming = await request(app).get('/api/auctions?status=upcoming');
    const ended = await request(app).get('/api/auctions?status=ended');
    const priceAscending = await request(app).get('/api/auctions?status=live&sort=price_asc');

    expect(live.status).toBe(200);
    expect(live.body.auctions.map((auction) => auction.id)).toEqual([soonerEnding.id, laterEnding.id]);
    expect(live.body.counts).toMatchObject({ live: 2, upcoming: 1, ended: 2 });
    expect(upcoming.body.auctions).toHaveLength(1);
    expect(upcoming.body.auctions[0].status).toBe('scheduled');
    expect(ended.body.auctions.map((auction) => auction.id)).toEqual([
      latestEnded.id,
      earlierEnded.id,
    ]);
    expect(priceAscending.body.auctions.map((auction) => auction.currentPrice)).toEqual([1200, 1500]);
  });

  it('returns auction details with masked bidder names and validates ids', async () => {
    const bike = await createBike();
    const user = await createUser({ name: 'Demo Bidder' });
    const auction = await createAuction(bike.id, { highestBidderId: user.id, currentPrice: 1100 });
    await createAuctionBid(auction.id, user.id, 1100);

    const detail = await request(app).get(`/api/auctions/${auction.id}`);
    const missing = await request(app).get('/api/auctions/999999');
    const invalid = await request(app).get('/api/auctions/not-a-number');

    expect(detail.status).toBe(200);
    expect(detail.body.auction.id).toBe(auction.id);
    expect(detail.body.bids[0].bidder).toBe('Demo B.');
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe('AUCTION_NOT_FOUND');
    expect(invalid.status).toBe(400);
  });
});

async function createAuctionBid(auctionId, userId, amount) {
  const { pool } = require('./helpers');
  const { randomUUID } = require('node:crypto');
  await pool.query(
    'INSERT INTO bids (auction_id, user_id, amount, request_id) VALUES (?, ?, ?, ?)',
    [auctionId, userId, amount, randomUUID()]
  );
}
