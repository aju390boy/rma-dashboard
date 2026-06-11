const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const Order = require('../../models/Order');

/**
 * Create a test user and return their JWT access token.
 * Uses the User model's pre-save hook to hash the password.
 */
const createUserAndToken = async (role = 'admin') => {
  const user = await User.create({
    name: `Test ${role}`,
    email: `${role}_${Date.now()}@test.com`, // unique per call
    password_hash: 'Test@1234',              // pre-save hook hashes this
    role,
    wallet_balance: 0,
  });

  const token = jwt.sign(
    { id: user._id, email: user.email, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  return { user, token };
};

/**
 * Create a minimal order in a given status for testing transitions.
 */
const createOrder = async (userId, overrides = {}) => {
  const { Types } = require('mongoose');
  return Order.create({
    user_id: userId,
    order_number: `ORD-TEST-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    products: [{
      product_id: new Types.ObjectId(),
      name: 'Test Product',
      price: 500,
      quantity: 2,
    }],
    total_amount: 1000,
    status: 'DELIVERED',
    payment_status: 'PAID',
    ...overrides,
  });
};

module.exports = { createUserAndToken, createOrder };
