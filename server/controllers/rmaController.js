const Order = require('../models/Order');
const AuditLog = require('../models/AuditLog');
const { validateTransition, buildRMAUpdate } = require('../services/stateMachine');
const { processRefund } = require('../services/walletService');
const { emitEvent } = require('../services/socketService');

/**
 * Universal transition handler — all FSM transitions go through here.
 * PATCH /api/rma/:orderId/transition
 * Body: { nextStatus, return_reason?, rejection_reason?, refund_amount? }
 */
const transitionOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { nextStatus, ...body } = req.body;

    if (!nextStatus) {
      return res.status(400).json({ success: false, message: 'nextStatus is required' });
    }

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    // FSM validation
    const { valid, error } = validateTransition(order.status, nextStatus, req.user.role, order, body);
    if (!valid) {
      return res.status(400).json({ success: false, message: error });
    }

    // Special case: REFUNDED uses atomic transaction
    if (nextStatus === 'REFUNDED') {
      const result = await processRefund(orderId, req.user.id);
      const updatedOrder = await Order.findById(orderId)
        .populate('user_id', 'name email wallet_balance')
        .populate('rma.reviewed_by', 'name email');
      // 🔌 Real-time: notify all dashboard agents
      emitEvent('rma:refunded', {
        orderId,
        orderNumber: order.order_number,
        customerName: updatedOrder.user_id?.name,
        refundAmount: result.refund_amount,
        performedBy: req.user.name,
      });
      return res.json({ success: true, data: { order: updatedOrder, ...result } });
    }

    // Build update payload from FSM + RMA data
    const rmaUpdates = buildRMAUpdate(nextStatus, body, req.user.id);

    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      {
        $set: {
          status: nextStatus,
          ...rmaUpdates,
        },
      },
      { new: true, runValidators: true }
    )
      .populate('user_id', 'name email wallet_balance')
      .populate('rma.reviewed_by', 'name email');

    // Write audit log
    await AuditLog.create({
      order_id: orderId,
      performed_by: req.user.id,
      action: `TRANSITION_TO_${nextStatus}`,
      from_status: order.status,
      to_status: nextStatus,
      metadata: body,
    });

    // 🔌 Real-time: broadcast transition event to dashboard room
    const socketEvents = {
      RETURN_REQUESTED:  'rma:new_return',
      RETURN_APPROVED:   'rma:approved',
      RETURN_REJECTED:   'rma:rejected',
      REFUND_INITIATED:  'rma:refund_initiated',
    };
    const eventName = socketEvents[nextStatus];
    if (eventName) {
      emitEvent(eventName, {
        orderId,
        orderNumber: order.order_number,
        customerName: updatedOrder.user_id?.name,
        fromStatus: order.status,
        toStatus: nextStatus,
        performedBy: req.user.name,
        returnReason: body.return_reason || null,
      });
    }

    res.json({ success: true, data: { order: updatedOrder } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/rma/:orderId/audit — full audit trail for an order
const getAuditLog = async (req, res) => {
  try {
    const logs = await AuditLog.find({ order_id: req.params.orderId })
      .populate('performed_by', 'name email role')
      .sort({ timestamp: 1 })
      .lean();

    res.json({ success: true, data: { logs } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/rma/pending — all orders awaiting action
const getPendingRMAs = async (req, res) => {
  try {
    const orders = await Order.find({
      status: { $in: ['RETURN_REQUESTED', 'RETURN_APPROVED', 'REFUND_INITIATED'] },
    })
      .populate('user_id', 'name email')
      .sort({ updatedAt: 1 }) // oldest first
      .lean();

    res.json({ success: true, data: { orders, count: orders.length } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { transitionOrder, getAuditLog, getPendingRMAs };
