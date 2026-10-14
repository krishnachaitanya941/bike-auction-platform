const request = require('supertest');
const { pool } = require('../../src/db');
const app = require('../../src/app');

describe('database connection error responses', () => {
  it('returns a sanitized 503 when a route cannot reach MySQL', async () => {
    const timeout = Object.assign(new Error('Database connection timed out'), {
      code: 'ETIMEDOUT',
    });
    const query = vi.spyOn(pool, 'query').mockRejectedValue(timeout);

    try {
      const response = await request(app).get('/api/auctions?status=live');

      expect(response.status).toBe(503);
      expect(response.body.error.code).toBe('DATABASE_UNAVAILABLE');
      expect(response.body.error.message).not.toContain('ETIMEDOUT');
      expect(response.body.error.message).not.toContain('timed out');
    } finally {
      query.mockRestore();
    }
  });
});
