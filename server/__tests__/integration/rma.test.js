/**
 * INTEGRATION TESTS — RMA Transitions + Atomic Refund
 * Tests the full return lifecycle via HTTP and verifies wallet atomicity.
 */
require('../setup/dbSetup');
const request = require('supertest');
const app = require('../../app');
const User = require('../../models/User');
const Order = require('../../models/Order');
const AuditLog = require('../../models/AuditLog');
const { createUserAndToken, createOrder } = require('../helpers/factories');

let adminToken, adminUser, supportToken, supportUser;

beforeEach(async () => {
  const admin = await createUserAndToken('admin');
  adminToken = admin.token;
  adminUser = admin.user;

  const support = await createUserAndToken('support');
  supportToken = support.token;
  supportUser = support.user;
});

// Helper: PATCH transition
const transition = (orderId, body, token) =>
  request(app)
    .patch(`/api/rma/${orderId}/transition`)
    .set('Authorization', `Bearer ${token}`)
    .send(body);

// ─────────────────────────────────────────────────────────────────
describe('RMA — RETURN_REQUESTED', () => {
  it('✅ customer can request return on a DELIVERED order', async () => {
    const order = await createOrder(adminUser._id, { status: 'DELIVERED' });

    const res = await transition(order._id, {
      nextStatus: 'RETURN_REQUESTED',
      return_reason: 'Item arrived damaged',
    }, adminToken);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.order.status).toBe('RETURN_REQUESTED');
    expect(res.body.data.order.rma.return_reason).toBe('Item arrived damaged');
  });

  it('❌ fails without return_reason', async () => {
    const order = await createOrder(adminUser._id, { status: 'DELIVERED' });

    const res = await transition(order._id, { nextStatus: 'RETURN_REQUESTED' }, adminToken);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/return_reason is required/);
  });

  it('❌ fails on non-DELIVERED order (e.g. PENDING)', async () => {
    const order = await createOrder(adminUser._id, { status: 'PENDING' });

    const res = await transition(order._id, {
      nextStatus: 'RETURN_REQUESTED',
      return_reason: 'Changed mind',
    }, adminToken);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/Cannot transition/);
  });
});

// ─────────────────────────────────────────────────────────────────
describe('RMA — RETURN_APPROVED', () => {
  it('✅ support can approve a return request', async () => {
    const order = await createOrder(adminUser._id, { status: 'RETURN_REQUESTED' });

    const res = await transition(order._id, {
      nextStatus: 'RETURN_APPROVED',
      refund_amount: 800,
    }, supportToken);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.order.status).toBe('RETURN_APPROVED');
    expect(res.body.data.order.rma.refund_amount).toBe(800);
  });
});

// ─────────────────────────────────────────────────────────────────
describe('RMA — RETURN_REJECTED', () => {
  it('✅ admin can reject a return with a reason', async () => {
    const order = await createOrder(adminUser._id, { status: 'RETURN_REQUESTED' });

    const res = await transition(order._id, {
      nextStatus: 'RETURN_REJECTED',
      rejection_reason: 'Item shows signs of use',
    }, adminToken);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.order.status).toBe('RETURN_REJECTED');
    expect(res.body.data.order.rma.rejection_reason).toBe('Item shows signs of use');
  });

  it('❌ support cannot transition from RETURN_REJECTED (terminal)', async () => {
    const order = await createOrder(adminUser._id, { status: 'RETURN_REJECTED' });

    const res = await transition(order._id, {
      nextStatus: 'RETURN_REQUESTED',
      return_reason: 'Try again',
    }, adminToken);

    expect(res.statusCode).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────
describe('RMA — REFUND_INITIATED', () => {
  it('✅ admin can initiate refund', async () => {
    const order = await createOrder(adminUser._id, {
      status: 'RETURN_APPROVED',
      payment_status: 'PAID',
    });

    const res = await transition(order._id, { nextStatus: 'REFUND_INITIATED' }, adminToken);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.order.status).toBe('REFUND_INITIATED');
  });

  it('❌ support cannot initiate refund (admin only)', async () => {
    const order = await createOrder(adminUser._id, {
      status: 'RETURN_APPROVED',
      payment_status: 'PAID',
    });

    const res = await transition(order._id, { nextStatus: 'REFUND_INITIATED' }, supportToken);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/not authorized/);
  });

  it('❌ blocked when payment_status is PROCESSING', async () => {
    const order = await createOrder(adminUser._id, {
      status: 'RETURN_APPROVED',
      payment_status: 'PROCESSING',
    });

    const res = await transition(order._id, { nextStatus: 'REFUND_INITIATED' }, adminToken);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/Payment status is/);
  });
});

// ─────────────────────────────────────────────────────────────────
describe('RMA — Atomic REFUND transaction', () => {
  it('✅ REFUNDED: atomically credits wallet + updates order + writes audit log', async () => {
    const initialBalance = 200;
    const refundAmount = 1000;

    // Give the user an initial wallet balance
    await User.updateOne({ _id: adminUser._id }, { wallet_balance: initialBalance });

    const order = await createOrder(adminUser._id, {
      status: 'REFUND_INITIATED',
      payment_status: 'PAID',
      total_amount: refundAmount,
    });

    const res = await transition(order._id, { nextStatus: 'REFUNDED' }, adminToken);

    expect(res.statusCode).toBe(200);

    // 1) Order status updated
    const updatedOrder = await Order.findById(order._id);
    expect(updatedOrder.status).toBe('REFUNDED');
    expect(updatedOrder.payment_status).toBe('REFUNDED');

    // 2) Wallet balance increased by refund amount (atomic)
    const updatedUser = await User.findById(adminUser._id);
    expect(updatedUser.wallet_balance).toBe(initialBalance + refundAmount);

    // 3) Audit log written inside transaction
    const auditLog = await AuditLog.findOne({
      order_id: order._id,
      action: 'REFUND_PROCESSED',
    });
    expect(auditLog).not.toBeNull();
    expect(auditLog.from_status).toBe('REFUND_INITIATED');
    expect(auditLog.to_status).toBe('REFUNDED');
    expect(auditLog.metadata.refund_amount).toBe(refundAmount);
  });

  it('✅ Full happy path: DELIVERED → RETURN_REQUESTED → RETURN_APPROVED → REFUND_INITIATED → REFUNDED', async () => {
    await User.updateOne({ _id: adminUser._id }, { wallet_balance: 0 });

    // Step 1: Start with DELIVERED order
    const order = await createOrder(adminUser._id, {
      status: 'DELIVERED',
      payment_status: 'PAID',
      total_amount: 750,
    });

    // Step 2: Request return
    let res = await transition(order._id, {
      nextStatus: 'RETURN_REQUESTED',
      return_reason: 'Wrong size delivered',
    }, adminToken);
    expect(res.body.data.order.status).toBe('RETURN_REQUESTED');

    // Step 3: Approve return
    res = await transition(order._id, {
      nextStatus: 'RETURN_APPROVED',
      refund_amount: 750,
    }, adminToken);
    expect(res.body.data.order.status).toBe('RETURN_APPROVED');

    // Step 4: Initiate refund (admin only)
    res = await transition(order._id, { nextStatus: 'REFUND_INITIATED' }, adminToken);
    expect(res.body.data.order.status).toBe('REFUND_INITIATED');

    // Step 5: Process refund (atomic)
    res = await transition(order._id, { nextStatus: 'REFUNDED' }, adminToken);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.order.status).toBe('REFUNDED');

    // Verify wallet credited
    const user = await User.findById(adminUser._id);
    expect(user.wallet_balance).toBe(750);

    // Verify audit trail has all 5 transitions
    const logs = await AuditLog.find({ order_id: order._id }).sort({ timestamp: 1 });
    expect(logs.length).toBeGreaterThanOrEqual(4);
    const actions = logs.map(l => l.action);
    expect(actions).toContain('TRANSITION_TO_RETURN_REQUESTED');
    expect(actions).toContain('TRANSITION_TO_RETURN_APPROVED');
    expect(actions).toContain('TRANSITION_TO_REFUND_INITIATED');
    expect(actions).toContain('REFUND_PROCESSED');
  });
});
