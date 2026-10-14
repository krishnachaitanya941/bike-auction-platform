const request = require('supertest');
const app = require('../../src/app');

describe('database-free HTTP security checks', () => {
  it('allows the local frontend origin and rejects unconfigured origins', async () => {
    const local = await request(app)
      .get('/')
      .set('Origin', 'http://localhost:8443');
    const unconfigured = await request(app)
      .get('/')
      .set('Origin', 'https://untrusted.example');

    expect(local.headers['access-control-allow-origin']).toBe('http://localhost:8443');
    expect(local.headers['access-control-allow-credentials']).toBe('true');
    expect(unconfigured.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('sets Helmet headers and returns errors without stack traces', async () => {
    const response = await request(app).get('/api/auth/me');

    expect(response.status).toBe(401);
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

  it('rate-limits authentication routes after the configured threshold', async () => {
    const responses = await Promise.all(
      Array.from({ length: 31 }, () =>
        request(app).get('/api/auth/me').set('X-Forwarded-For', '203.0.113.91')
      )
    );

    expect(responses.slice(0, 30).every((response) => response.status === 401)).toBe(true);
    expect(responses[30].status).toBe(429);
  });
});
