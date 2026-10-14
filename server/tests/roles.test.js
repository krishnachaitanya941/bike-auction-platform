const request = require('supertest');
const app = require('../src/app');
const { createUser } = require('./helpers');

const bikeBody = {
  make: 'Yamaha',
  model: 'MT-07',
  year: 2023,
  mileageKm: 5000,
};

describe('role authorization', () => {
  it('forbids regular users and allows an admin to create bikes and auctions and cancel', async () => {
    const user = await createUser();
    const admin = await createUser({ role: 'admin', name: 'Admin User' });

    expect(
      (await request(app).post('/api/bikes').set('Authorization', `Bearer ${user.token}`).send(bikeBody))
        .status
    ).toBe(403);
    expect(
      (
        await request(app)
          .post('/api/auctions')
          .set('Authorization', `Bearer ${user.token}`)
          .send({})
      ).status
    ).toBe(403);
    expect(
      (
        await request(app)
          .patch('/api/auctions/1/cancel')
          .set('Authorization', `Bearer ${user.token}`)
      ).status
    ).toBe(403);

    const bike = await request(app)
      .post('/api/bikes')
      .set('Authorization', `Bearer ${admin.token}`)
      .send(bikeBody);
    expect(bike.status).toBe(201);

    const created = await request(app)
      .post('/api/auctions')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        bikeId: bike.body.id,
        startingPrice: 1000,
        minIncrement: 100,
        startsAt: new Date(Date.now() + 60_000).toISOString(),
        endsAt: new Date(Date.now() + 120_000).toISOString(),
      });
    expect(created.status).toBe(201);

    const cancelled = await request(app)
      .patch(`/api/auctions/${created.body.id}/cancel`)
      .set('Authorization', `Bearer ${admin.token}`);
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.status).toBe('cancelled');
  });
});
