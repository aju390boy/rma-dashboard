const mongoose = require('mongoose');
const Order = require('../models/Order');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

/**
 * Atomically update order status to REFUNDED and credit user's wallet.
 * Uses MongoDB transactions — requires replica set.
 */
const processRefund = async (orderId, performedById) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const order = await Order.findById(orderId).session(session);
    if (!order) throw new Error('Order not found');

    const refundAmount = order.rma?.refund_amount || order.total_amount;

    // 1) Update order status
    await Order.updateOne(
      { _id: orderId },
      {
        $set: {
          status: 'REFUNDED',
          payment_status: 'REFUNDED',
          'rma.refunded_at': new Date(),
        },
      },
      { session }
    );

    // 2) Credit user's wallet
    await User.updateOne(
      { _id: order.user_id },
      { $inc: { wallet_balance: refundAmount } },
      { session }
    );

    // 3) Write audit log inside transaction
    await AuditLog.create(
      [
        {
          order_id: orderId,
          performed_by: performedById,
          action: 'REFUND_PROCESSED',
          from_status: 'REFUND_INITIATED',
          to_status: 'REFUNDED',
          metadata: { refund_amount: refundAmount },
        },
      ],
      { session }
    );

    await session.commitTransaction();

    return { success: true, refund_amount: refundAmount };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

module.exports = { processRefund };
