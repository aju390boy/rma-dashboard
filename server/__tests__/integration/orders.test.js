/**
 * INTEGRATION TESTS — Orders API
 * Tests pagination, filtering, customer name search, analytics.
 */
require('../setup/dbSetup');
const request = require('supertest');
const app = require('../../app');
const { createUserAndToken, createOrder } = require('../helpers/factories');

let adminToken, adminUser;

beforeEach(async () => {
  const result = await createUserAndToken('admin');
  adminToken = result.token;
  adminUser = result.user;
});

describe('GET /api/orders', () => {
  it('✅ returns paginated orders list', async () => {
    // Create 3 orders
    await Promise.all([
      createOrder(adminUser._id),
      createOrder(adminUser._id),
      createOrder(adminUser._id),
    ]);

    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.orders).toHaveLength(3);
    expect(res.body.data.pagination.total).toBe(3);
  });

  it('✅ respects limit and page query params', async () => {
    await Promise.all(Array.from({ length: 5 }, () => createOrder(adminUser._id)));

    const res = await request(app)
      .get('/api/orders?limit=2&page=1')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.orders).toHaveLength(2);
    expect(res.body.data.pagination.totalPages).toBe(3);
  });

  it('✅ filters orders by status', async () => {
    await createOrder(adminUser._id, { status: 'PENDING' });
    await createOrder(adminUser._id, { status: 'DELIVERED' });
    await createOrder(adminUser._id, { status: 'DELIVERED' });

    const res = await request(app)
      .get('/api/orders?status=DELIVERED')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.pagination.total).toBe(2);
    res.body.data.orders.forEach(o => expect(o.status).toBe('DELIVERED'));
  });

  it('✅ searches orders by customer name', async () => {
    // Create second user with distinct name
    const { user: otherUser } = await createUserAndToken('support');
    await createOrder(adminUser._id);   // Test admin
    await createOrder(otherUser._id);  // Test support

    const res = await request(app)
      .get(`/api/orders?customerName=admin`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.pagination.total).toBe(1);
    expect(res.body.data.orders[0].user_id.name).toMatch(/admin/i);
  });

  it('❌ returns 401 without token', async () => {
    const res = await request(app).get('/api/orders');
    expect(res.statusCode).toBe(401);
  });
});

describe('GET /api/orders/stats', () => {
  it('✅ returns statusBreakdown and totalRevenue', async () => {
    await createOrder(adminUser._id, { status: 'DELIVERED', payment_status: 'PAID', total_amount: 500 });
    await createOrder(adminUser._id, { status: 'PENDING', payment_status: 'PENDING', total_amount: 300 });

    const res = await request(app)
      .get('/api/orders/stats')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.statusBreakdown).toBeDefined();
    expect(res.body.data.totalRevenue).toBeGreaterThanOrEqual(500);
  });
});

describe('GET /api/orders/analytics', () => {
  it('✅ returns all 6 analytics datasets', async () => {
    const res = await request(app)
      .get('/api/orders/analytics')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    const { data } = res.body;
    expect(data.dailyOrders).toBeDefined();
    expect(data.dailyRevenue).toBeDefined();
    expect(data.returnReasons).toBeDefined();
    expect(data.statusDistribution).toBeDefined();
    expect(data.topReturnedProducts).toBeDefined();
    expect(data.refundStats).toBeDefined();
  });
});

describe('GET /api/orders/:id', () => {
  it('✅ returns a single order by ID', async () => {
    const order = await createOrder(adminUser._id);

    const res = await request(app)
      .get(`/api/orders/${order._id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.order._id).toBe(order._id.toString());
  });

  it('❌ returns 404 for non-existent order ID', async () => {
    const fakeId = '64f1e2c3a4b5c6d7e8f90123';
    const res = await request(app)
      .get(`/api/orders/${fakeId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(404);
  });
});
