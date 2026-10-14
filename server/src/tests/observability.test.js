const request = require('supertest');
const app = require('../src/app');

describe('observability', () => {
  it('returns an X-Request-Id and reuses a valid incoming one', async () => {
    const a = await request(app).get('/health');
    expect(a.headers['x-request-id']).toMatch(/^[\w-]{8,64}$/);
    const b = await request(app).get('/health').set('X-Request-Id', 'abc-12345678');
    expect(b.headers['x-request-id']).toBe('abc-12345678');
  });

  it('includes the request id in error responses', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error.requestId).toBe(res.headers['x-request-id']);
  });

  it('exposes Prometheus metrics with route labels', async () => {
    await request(app).get('/api/auctions');
    const res = await request(app).get('/metrics');
    expect(res.status).toBe(200);
    expect(res.text).toContain('http_request_duration_seconds');
    expect(res.text).toContain('route="/api/auctions"');
  });

  it('protects /metrics when METRICS_TOKEN is set', async () => {
    process.env.METRICS_TOKEN = 'test-metrics-token';
    try {
      expect((await request(app).get('/metrics')).status).toBe(401);
      const ok = await request(app).get('/metrics').set('Authorization', 'Bearer test-metrics-token');
      expect(ok.status).toBe(200);
    } finally {
      delete process.env.METRICS_TOKEN;
    }
  });
});