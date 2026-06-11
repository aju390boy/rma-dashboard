/**
 * INTEGRATION TESTS — Auth Routes
 * Tests login, invalid credentials, token structure.
 */
require('../setup/dbSetup');
const request = require('supertest');
const app = require('../../app');
const User = require('../../models/User');

// Seed a test admin user before each test
const seedUser = async () => {
  return User.create({
    name: 'Test Admin',
    email: 'admin@test.com',
    password_hash: 'Admin@123',  // pre-save hook hashes this
    role: 'admin',
    wallet_balance: 0,
  });
};

describe('POST /api/auth/login', () => {
  beforeEach(seedUser);

  it('✅ returns 200 + accessToken with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'Admin@123' });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.user.email).toBe('admin@test.com');
    expect(res.body.data.user.role).toBe('admin');
    // password should NOT be in response
    expect(res.body.data.user.password).toBeUndefined();
  });

  it('✅ sets httpOnly refresh token cookie', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'Admin@123' });

    expect(res.headers['set-cookie']).toBeDefined();
    const cookie = res.headers['set-cookie'][0];
    expect(cookie).toMatch(/refreshToken/);
    expect(cookie).toMatch(/HttpOnly/i);
  });

  it('❌ returns 401 with wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'WrongPassword' });

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('❌ returns 401 with non-existent email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@test.com', password: 'Admin@123' });

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('❌ returns 400 with missing fields', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com' }); // no password

    expect(res.statusCode).toBe(400);
  });
});

describe('GET /api/auth/me', () => {
  let token;

  beforeEach(async () => {
    await seedUser();
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'Admin@123' });
    token = res.body.data.accessToken;
  });

  it('✅ returns current user with valid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.user.email).toBe('admin@test.com');
  });

  it('❌ returns 401 with no token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.statusCode).toBe(401);
  });

  it('❌ returns 403 with malformed token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer not-a-real-token');
    expect(res.statusCode).toBe(403);
  });
});
