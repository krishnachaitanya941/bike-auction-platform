const { randomUUID } = require('node:crypto');
const request = require('supertest');
const app = require('../src/app');
const { createBike, createUser, createAuction, pool } = require('./helpers');

async function setupLiveAuction(overrides = {}) {
  const bike = await createBike();
  const auction = await createAuction(bike.id, overrides);
  return auction;
}

function sendBid(auctionId, token, amount, requestId = randomUUID()) {
  const call = request(app).post(`/api/auctions/${auctionId}/bids`);
  if (token) call.set('Authorization', `Bearer ${token}`);
  return call.send({ amount, requestId });
}

describe('bidding', () => {
  it('accepts a valid bid and updates the auction price, leader, and count', async () => {
    const auction = await setupLiveAuction();
    const bidder = await createUser();
    const response = await sendBid(auction.id, bidder.token, 1000);

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      auctionId: auction.id,
      currentPrice: 1000,
      highestBidderId: bidder.id,
      minNextBid: 1100,
      duplicate: false,
    });
    const [[updated]] = await pool.query(
      'SELECT current_price, highest_bidder_id, (SELECT COUNT(*) FROM bids WHERE auction_id = ?) AS bid_count FROM auctions WHERE id = ?',
      [auction.id, auction.id]
    );
    expect(Number(updated.current_price)).toBe(1000);
    expect(Number(updated.highest_bidder_id)).toBe(bidder.id);
    expect(Number(updated.bid_count)).toBe(1);
  });

  it('allows a first bid at the starting price and enforces the next increment', async () => {
    const auction = await setupLiveAuction();
    const firstBidder = await createUser();
    const secondBidder = await createUser();

    expect((await sendBid(auction.id, firstBidder.token, 1000)).status).toBe(201);
    expect((await sendBid(auction.id, secondBidder.token, 1099)).status).toBe(422);
    expect((await sendBid(auction.id, secondBidder.token, 1100)).status).toBe(201);
  });

  it('returns minimum bid details and prevents the current highest bidder from bidding again', async () => {
    const auction = await setupLiveAuction();
    const bidder = await createUser();
    const otherBidder = await createUser();
    await sendBid(auction.id, bidder.token, 1000);

    const lowBid = await sendBid(auction.id, otherBidder.token, 1099);
    const sameLeader = await sendBid(auction.id, bidder.token, 1100);

    expect(lowBid.status).toBe(422);
    expect(lowBid.body.error.code).toBe('BID_TOO_LOW');
    expect(lowBid.body.error.details.minNextBid).toBe(1100);
    expect(sameLeader.status).toBe(409);
    expect(sameLeader.body.error.code).toBe('ALREADY_HIGHEST_BIDDER');
  });

  it('replays the original response for a repeated request id and stores one bid', async () => {
    const auction = await setupLiveAuction({ endsAt: new Date(Date.now() + 20_000) });
    const bidder = await createUser();
    const requestId = randomUUID();
    const first = await sendBid(auction.id, bidder.token, 1000, requestId);
    const retry = await sendBid(auction.id, bidder.token, 1000, requestId);
    const [[count]] = await pool.query(
      'SELECT COUNT(*) AS count FROM bids WHERE auction_id = ? AND user_id = ?',
      [auction.id, bidder.id]
    );

    expect(first.status).toBe(201);
    expect(retry.status).toBe(200);
    expect(retry.body).toEqual({ ...first.body, duplicate: true });
    expect(Number(count.count)).toBe(1);
  });

  it.each(['scheduled', 'ended', 'cancelled'])('rejects bids for %s auctions', async (status) => {
    const auction = await setupLiveAuction(
      status === 'scheduled'
        ? {
            status,
            startsAt: new Date(Date.now() + 60 * 60 * 1000),
            endsAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
          }
        : { status }
    );
    const bidder = await createUser();
    const response = await sendBid(auction.id, bidder.token, 1000);

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('AUCTION_NOT_LIVE');
  });

  it('rejects unauthenticated and malformed bid requests', async () => {
    const auction = await setupLiveAuction();
    const bidder = await createUser();

    expect((await sendBid(auction.id, null, 1000)).status).toBe(401);
    const missingRequestId = await request(app)
      .post(`/api/auctions/${auction.id}/bids`)
      .set('Authorization', `Bearer ${bidder.token}`)
      .send({ amount: 1000 });
    const negativeAmount = await sendBid(auction.id, bidder.token, -1);
    const fractionalCent = await sendBid(auction.id, bidder.token, 1000.001);

    expect(missingRequestId.status).toBe(422);
    expect(negativeAmount.status).toBe(422);
    expect(fractionalCent.status).toBe(422);
  });

  it('extends an auction ending within 30 seconds, but not one ending earlier', async () => {
    const bidder = await createUser();
    const soon = await setupLiveAuction({ endsAt: new Date(Date.now() + 20_000) });
    const earlier = await setupLiveAuction({ endsAt: new Date(Date.now() + 60_000) });
    const [[soonBefore]] = await pool.query('SELECT ends_at FROM auctions WHERE id = ?', [soon.id]);
    const [[earlierBefore]] = await pool.query('SELECT ends_at FROM auctions WHERE id = ?', [earlier.id]);

    const extended = await sendBid(soon.id, bidder.token, 1000);
    const unchanged = await sendBid(earlier.id, bidder.token, 1000);
    const [[soonRow]] = await pool.query('SELECT ends_at FROM auctions WHERE id = ?', [soon.id]);
    const [[earlierRow]] = await pool.query('SELECT ends_at FROM auctions WHERE id = ?', [earlier.id]);

    expect(extended.body.extended).toBe(true);
    expect(new Date(soonRow.ends_at).getTime() - new Date(soonBefore.ends_at).getTime()).toBe(30_000);
    expect(unchanged.body.extended).toBe(false);
    expect(new Date(earlierRow.ends_at).getTime()).toBe(new Date(earlierBefore.ends_at).getTime());
  });

  it('reports the previous leader when a bid outbids them', async () => {
    const auction = await setupLiveAuction();
    const previous = await createUser();
    const next = await createUser();
    await sendBid(auction.id, previous.token, 1000);

    const response = await sendBid(auction.id, next.token, 1100);
    expect(response.body.previousHighestBidderId).toBe(previous.id);
  });

  it(
    'serializes 50 concurrent bids without accepting duplicates or out-of-order prices',
    async () => {
      const auction = await setupLiveAuction();
      const users = await Promise.all(Array.from({ length: 10 }, () => createUser()));
      const responses = await Promise.all(
        Array.from({ length: 50 }, (_, index) => {
          const amount = 1100 + Math.floor(Math.random() * 500) * 100;
          return sendBid(auction.id, users[index % users.length].token, amount);
        })
      );
      const [rows] = await pool.query(
        'SELECT id, user_id, amount FROM bids WHERE auction_id = ? ORDER BY id ASC',
        [auction.id]
      );
      const [[updated]] = await pool.query(
        'SELECT current_price, highest_bidder_id FROM auctions WHERE id = ?',
        [auction.id]
      );

      expect(responses.some((response) => response.status === 201)).toBe(true);
      const amounts = rows.map((row) => Number(row.amount));
      for (let index = 0; index < amounts.length; index += 1) {
        expect(amounts[index]).toBeGreaterThanOrEqual(
          index === 0 ? 1000 : amounts[index - 1] + 100
        );
      }
      expect(new Set(amounts).size).toBe(amounts.length);
      const maxRow = rows.reduce((max, row) =>
        Number(row.amount) > Number(max.amount) ? row : max
      );
      expect(Number(updated.current_price)).toBe(Number(maxRow.amount));
      expect(Number(updated.highest_bidder_id)).toBe(Number(maxRow.user_id));
    },
    30_000
  );

  it(
    'stores exactly one bid when a user submits the same request id 20 times concurrently',
    async () => {
      const auction = await setupLiveAuction();
      const bidder = await createUser();
      const requestId = randomUUID();
      const responses = await Promise.all(
        Array.from({ length: 20 }, () => sendBid(auction.id, bidder.token, 1000, requestId))
      );
      const [[count]] = await pool.query(
        'SELECT COUNT(*) AS count FROM bids WHERE auction_id = ? AND user_id = ?',
        [auction.id, bidder.id]
      );

      expect(responses.filter((response) => response.status === 201)).toHaveLength(1);
      expect(responses.filter((response) => response.status === 200)).toHaveLength(19);
      expect(Number(count.count)).toBe(1);
    },
    30_000
  );
});
