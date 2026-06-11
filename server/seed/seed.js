require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Order = require('../models/Order');
const AuditLog = require('../models/AuditLog');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/rma_dashboard?replicaSet=rs0';

const PRODUCTS = [
  { product_id: 'P001', name: 'Sony WH-1000XM5 Headphones', price: 349.99, image_url: 'https://picsum.photos/seed/P001/80/80' },
  { product_id: 'P002', name: 'Apple MacBook Air M2', price: 1299.99, image_url: 'https://picsum.photos/seed/P002/80/80' },
  { product_id: 'P003', name: 'Samsung 65" QLED TV', price: 1499.99, image_url: 'https://picsum.photos/seed/P003/80/80' },
  { product_id: 'P004', name: 'Logitech MX Master 3', price: 99.99, image_url: 'https://picsum.photos/seed/P004/80/80' },
  { product_id: 'P005', name: 'iPad Pro 12.9" M2', price: 1099.99, image_url: 'https://picsum.photos/seed/P005/80/80' },
  { product_id: 'P006', name: 'DJI Mini 3 Pro Drone', price: 759.99, image_url: 'https://picsum.photos/seed/P006/80/80' },
  { product_id: 'P007', name: 'Bose QuietComfort 45', price: 279.99, image_url: 'https://picsum.photos/seed/P007/80/80' },
  { product_id: 'P008', name: 'Nintendo Switch OLED', price: 349.99, image_url: 'https://picsum.photos/seed/P008/80/80' },
  { product_id: 'P009', name: 'GoPro HERO12 Black', price: 399.99, image_url: 'https://picsum.photos/seed/P009/80/80' },
  { product_id: 'P010', name: 'Mechanical Keyboard K95', price: 199.99, image_url: 'https://picsum.photos/seed/P010/80/80' },
];

const RETURN_REASONS = [
  'Product arrived damaged',
  'Wrong item received',
  'Item not as described',
  'Changed my mind',
  'Found a better price elsewhere',
  'Product stopped working after a few days',
  'Missing parts in the package',
];

const REJECTION_REASONS = [
  'Return window has expired',
  'Item shows signs of misuse',
  'Non-returnable item category',
];

const CUSTOMER_NAMES = [
  'Arjun Sharma', 'Priya Patel', 'Rahul Verma', 'Anita Singh', 'Kiran Mehta',
  'Deepak Kumar', 'Sneha Reddy', 'Vikram Nair', 'Pooja Gupta', 'Amit Joshi',
  'Neha Agarwal', 'Ravi Krishnan', 'Sunita Desai', 'Manish Tiwari', 'Kavya Rao',
];

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randDate = (daysAgo) => {
  const d = new Date();
  d.setDate(d.getDate() - randInt(0, daysAgo));
  return d;
};

const generateOrderNumber = (idx) => {
  const year = new Date().getFullYear();
  return `ORD-${year}-${String(idx + 1000).padStart(6, '0')}`;
};

const generateProducts = () => {
  const count = randInt(1, 3);
  const selected = [];
  const used = new Set();
  while (selected.length < count) {
    const p = rand(PRODUCTS);
    if (!used.has(p.product_id)) {
      used.add(p.product_id);
      selected.push({ ...p, quantity: randInt(1, 3) });
    }
  }
  return selected;
};

const STATUS_SCENARIOS = [
  // [status, payment_status, has_rma_data]
  { status: 'PENDING', payment_status: 'PENDING', weight: 8 },
  { status: 'PROCESSING', payment_status: 'PROCESSING', weight: 10 },
  { status: 'SHIPPED', payment_status: 'PAID', weight: 12 },
  { status: 'DELIVERED', payment_status: 'PAID', weight: 20 },
  { status: 'RETURN_REQUESTED', payment_status: 'PAID', weight: 15 },
  { status: 'RETURN_APPROVED', payment_status: 'PAID', weight: 10 },
  { status: 'RETURN_REJECTED', payment_status: 'PAID', weight: 7 },
  { status: 'REFUND_INITIATED', payment_status: 'PAID', weight: 8 },
  { status: 'REFUNDED', payment_status: 'REFUNDED', weight: 10 },
];

const weightedRand = (scenarios) => {
  const total = scenarios.reduce((s, sc) => s + sc.weight, 0);
  let r = Math.random() * total;
  for (const sc of scenarios) {
    r -= sc.weight;
    if (r <= 0) return sc;
  }
  return scenarios[scenarios.length - 1];
};

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB');

  // Clear existing data
  await Promise.all([User.deleteMany({}), Order.deleteMany({}), AuditLog.deleteMany({})]);
  console.log('🗑️  Cleared existing data');

  // Create staff accounts
  const salt = await bcrypt.genSalt(10);
  const staffUsers = await User.insertMany([
    {
      name: 'Super Admin',
      email: 'admin@rma.dev',
      password_hash: await bcrypt.hash('Admin@123', salt),
      role: 'admin',
      wallet_balance: 0,
    },
    {
      name: 'Support Agent',
      email: 'support@rma.dev',
      password_hash: await bcrypt.hash('Support@123', salt),
      role: 'support',
      wallet_balance: 0,
    },
  ]);
  console.log(`👤 Created ${staffUsers.length} staff users`);

  // Create customer accounts
  const customerUsers = await Promise.all(
    CUSTOMER_NAMES.map(async (name) => ({
      name,
      email: `${name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
      password_hash: await bcrypt.hash('Customer@123', salt),
      role: 'customer',
      wallet_balance: randInt(0, 500),
    }))
  );
  const customers = await User.insertMany(customerUsers);
  console.log(`👥 Created ${customers.length} customer users`);

  const adminUser = staffUsers[0];
  const supportUser = staffUsers[1];

  // Generate 500 orders
  const orders = [];
  for (let i = 0; i < 500; i++) {
    const customer = rand(customers);
    const products = generateProducts();
    const total_amount = parseFloat(
      products.reduce((s, p) => s + p.price * p.quantity, 0).toFixed(2)
    );
    const scenario = weightedRand(STATUS_SCENARIOS);
    const createdAt = randDate(180);

    const rma = {};
    const reviewer = Math.random() > 0.5 ? adminUser : supportUser;

    if (['RETURN_REQUESTED', 'RETURN_APPROVED', 'RETURN_REJECTED', 'REFUND_INITIATED', 'REFUNDED'].includes(scenario.status)) {
      rma.return_reason = rand(RETURN_REASONS);
      rma.requested_at = new Date(createdAt.getTime() + randInt(1, 10) * 86400000);
    }
    if (['RETURN_APPROVED', 'REFUND_INITIATED', 'REFUNDED'].includes(scenario.status)) {
      rma.reviewed_by = reviewer._id;
      rma.reviewed_at = new Date(rma.requested_at.getTime() + randInt(1, 3) * 86400000);
      rma.refund_amount = parseFloat((total_amount * (Math.random() * 0.3 + 0.7)).toFixed(2));
    }
    if (scenario.status === 'RETURN_REJECTED') {
      rma.reviewed_by = reviewer._id;
      rma.reviewed_at = new Date(rma.requested_at.getTime() + randInt(1, 3) * 86400000);
      rma.rejection_reason = rand(REJECTION_REASONS);
    }
    if (scenario.status === 'REFUNDED') {
      rma.refunded_at = new Date(rma.reviewed_at.getTime() + randInt(1, 2) * 86400000);
    }

    orders.push({
      order_number: generateOrderNumber(i),
      user_id: customer._id,
      products,
      total_amount,
      status: scenario.status,
      payment_status: scenario.payment_status,
      rma,
      createdAt,
      updatedAt: rma.refunded_at || rma.reviewed_at || rma.requested_at || createdAt,
    });
  }

  await Order.insertMany(orders, { timestamps: false });
  console.log(`📦 Created ${orders.length} orders`);

  console.log('\n✅ Seed complete!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔐 Demo Login Credentials:');
  console.log('   Admin:   admin@rma.dev   / Admin@123');
  console.log('   Support: support@rma.dev / Support@123');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
