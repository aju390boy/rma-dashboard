const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  product_id: { type: String, required: true },
  name: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true, min: 0 },
  image_url: { type: String, default: '' },
}, { _id: false });

const rmaSchema = new mongoose.Schema({
  return_reason: { type: String, default: null },
  requested_at: { type: Date, default: null },
  reviewed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reviewed_at: { type: Date, default: null },
  rejection_reason: { type: String, default: null },
  refund_amount: { type: Number, default: null },
  refunded_at: { type: Date, default: null },
}, { _id: false });

const ORDER_STATUSES = [
  'PENDING',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'RETURN_REQUESTED',
  'RETURN_APPROVED',
  'RETURN_REJECTED',
  'REFUND_INITIATED',
  'REFUNDED',
];

const PAYMENT_STATUSES = ['PENDING', 'PROCESSING', 'PAID', 'FAILED', 'REFUNDED'];

const orderSchema = new mongoose.Schema(
  {
    order_number: {
      type: String,
      unique: true,
      required: true,
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    products: {
      type: [productSchema],
      required: true,
      validate: {
        validator: (arr) => arr.length > 0,
        message: 'Order must have at least one product',
      },
    },
    total_amount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ORDER_STATUSES,
      default: 'PENDING',
      index: true,
    },
    payment_status: {
      type: String,
      enum: PAYMENT_STATUSES,
      default: 'PENDING',
      index: true,
    },
    rma: { type: rmaSchema, default: () => ({}) },
    notes: { type: String, default: '' },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient filtering
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ user_id: 1, status: 1 });

module.exports = mongoose.model('Order', orderSchema);
module.exports.ORDER_STATUSES = ORDER_STATUSES;
module.exports.PAYMENT_STATUSES = PAYMENT_STATUSES;
