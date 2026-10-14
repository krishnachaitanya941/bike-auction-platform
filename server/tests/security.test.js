const request = require('supertest');
const app = require('../src/app');

describe('security and error handling', () => {
  it('applies the auth rate limit', async () => {
    const results = await Promise.all(
      Array.from({ length: 31 }, () =>
        request(app).get('/api/auth/me').set('X-Forwarded-For', '203.0.113.77')
      )
    );

    expect(results.slice(0, 30).every((response) => response.status === 401)).toBe(true);
    expect(results[30].status).toBe(429);
  });

  it('sets Helmet headers and does not expose stack traces', async () => {
    const response = await request(app).get('/api/auth/me');

    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(JSON.stringify(response.body)).not.toMatch(/stack|at\s+\w+\s*\(/i);
  });

  it('returns BAD_JSON for malformed JSON bodies', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('BAD_JSON');
    expect(JSON.stringify(response.body)).not.toMatch(/stack|SyntaxError/);
  });
});
