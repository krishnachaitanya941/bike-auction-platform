const request = require('supertest');
const app = require('../src/app');
const { pool } = require('./helpers');

describe('authentication', () => {
  it('registers a user and returns a token without exposing the password', async () => {
    const response = await request(app).post('/api/auth/register').send({
      name: 'Demo Bidder',
      email: 'demo@example.test',
      password: 'Password123',
    });

    expect(response.status).toBe(201);
    expect(response.body.token).toEqual(expect.any(String));
    expect(response.body.user).toMatchObject({ name: 'Demo Bidder', role: 'user' });
    expect(response.body.user).not.toHaveProperty('password');
    expect(response.body.user).not.toHaveProperty('password_hash');
  });

  it('rejects duplicate email addresses', async () => {
    const body = { name: 'Demo Bidder', email: 'demo@example.test', password: 'Password123' };
    expect((await request(app).post('/api/auth/register').send(body)).status).toBe(201);
    const duplicate = await request(app).post('/api/auth/register').send(body);

    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.code).toBe('EMAIL_TAKEN');
  });

  it('returns field details for invalid registration data', async () => {
    const response = await request(app).post('/api/auth/register').send({
      name: 'A',
      email: 'not-an-email',
      password: 'short',
    });

    expect(response.status).toBe(422);
    expect(response.body.error.details.map((detail) => detail.field)).toEqual(
      expect.arrayContaining(['name', 'email', 'password'])
    );
  });

  it('logs in and gives the same credential error for an unknown email and wrong password', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Demo Bidder',
      email: 'demo@example.test',
      password: 'Password123',
    });
    const success = await request(app).post('/api/auth/login').send({
      email: 'demo@example.test',
      password: 'Password123',
    });
    const wrongPassword = await request(app).post('/api/auth/login').send({
      email: 'demo@example.test',
      password: 'WrongPassword',
    });
    const unknownEmail = await request(app).post('/api/auth/login').send({
      email: 'unknown@example.test',
      password: 'WrongPassword',
    });

    expect(success.status).toBe(200);
    expect(success.body.token).toEqual(expect.any(String));
    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body.error).toMatchObject({
      code: 'INVALID_CREDENTIALS',
      message: unknownEmail.body.error.message,
    });
    expect(unknownEmail.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('authenticates /me and rejects missing or invalid tokens', async () => {
    const registered = await request(app).post('/api/auth/register').send({
      name: 'Demo Bidder',
      email: 'demo@example.test',
      password: 'Password123',
    });
    const withToken = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${registered.body.token}`);

    expect(withToken.status).toBe(200);
    expect(withToken.body.user.email).toBe('demo@example.test');
    expect((await request(app).get('/api/auth/me')).status).toBe(401);
    expect(
      (await request(app).get('/api/auth/me').set('Authorization', 'Bearer invalid.token.value')).status
    ).toBe(401);
  });

  it('stores a password hash rather than the submitted password', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Demo Bidder',
      email: 'demo@example.test',
      password: 'Password123',
    });
    const [[user]] = await pool.query('SELECT password_hash FROM users WHERE email = ?', [
      'demo@example.test',
    ]);

    expect(user.password_hash).not.toBe('Password123');
    expect(user.password_hash).toMatch(/^\$2[aby]\$/);
  });
});
