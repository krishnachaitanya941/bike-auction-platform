const { tick } = require('../src/scheduler');
const { createBike, createAuction, pool } = require('./helpers');

describe('auction scheduler', () => {
  it('starts eligible scheduled auctions, ends expired auctions, and preserves cancellations', async () => {
    const bike = await createBike();
    const now = Date.now();
    const scheduled = await createAuction(bike.id, {
      status: 'scheduled',
      startsAt: new Date(now - 10_000),
      endsAt: new Date(now + 60_000),
    });
    const expired = await createAuction(bike.id, {
      status: 'live',
      startsAt: new Date(now - 120_000),
      endsAt: new Date(now - 10_000),
    });
    const cancelled = await createAuction(bike.id, {
      status: 'cancelled',
      startsAt: new Date(now - 120_000),
      endsAt: new Date(now - 10_000),
    });

    await tick();
    const [rows] = await pool.query('SELECT id, status FROM auctions ORDER BY id ASC');
    const statusById = Object.fromEntries(rows.map((row) => [row.id, row.status]));

    expect(statusById[scheduled.id]).toBe('live');
    expect(statusById[expired.id]).toBe('ended');
    expect(statusById[cancelled.id]).toBe('cancelled');
  });
});
