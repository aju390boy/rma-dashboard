/**
 * Order Finite State Machine
 * Defines all valid transitions, guards, and metadata for each state change.
 */

const TRANSITIONS = {
  PENDING: ['PROCESSING'],
  PROCESSING: ['SHIPPED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: ['RETURN_REQUESTED'],
  RETURN_REQUESTED: ['RETURN_APPROVED', 'RETURN_REJECTED'],
  RETURN_APPROVED: ['REFUND_INITIATED'],
  RETURN_REJECTED: [], // terminal
  REFUND_INITIATED: ['REFUNDED'],
  REFUNDED: [],        // terminal
};

// States that require admin or support role
const RESTRICTED_TRANSITIONS = {
  RETURN_APPROVED: ['admin', 'support'],
  RETURN_REJECTED: ['admin', 'support'],
  REFUND_INITIATED: ['admin'],
  REFUNDED: ['admin'],
};

/**
 * Validate if a transition from currentStatus → nextStatus is allowed.
 * Returns { valid: true } or { valid: false, error: string }
 */
const validateTransition = (currentStatus, nextStatus, userRole, order, body = {}) => {
  // Check if transition exists in FSM map
  const allowedNext = TRANSITIONS[currentStatus];
  if (!allowedNext) {
    return { valid: false, error: `Unknown current status: ${currentStatus}` };
  }
  if (!allowedNext.includes(nextStatus)) {
    return {
      valid: false,
      error: `Cannot transition from ${currentStatus} to ${nextStatus}. Allowed: [${allowedNext.join(', ') || 'none (terminal state)'}]`,
    };
  }

  // Role guard
  const requiredRoles = RESTRICTED_TRANSITIONS[nextStatus];
  if (requiredRoles && !requiredRoles.includes(userRole)) {
    return {
      valid: false,
      error: `Role '${userRole}' is not authorized to transition to ${nextStatus}. Required: [${requiredRoles.join(', ')}]`,
    };
  }

  // State-specific guards
  if (nextStatus === 'RETURN_REQUESTED') {
    if (!body.return_reason || body.return_reason.trim() === '') {
      return { valid: false, error: 'return_reason is required to request a return.' };
    }
  }

  if (nextStatus === 'RETURN_REJECTED') {
    if (!body.rejection_reason || body.rejection_reason.trim() === '') {
      return { valid: false, error: 'rejection_reason is required when rejecting a return.' };
    }
  }

  if (nextStatus === 'REFUND_INITIATED') {
    // Critical guard: cannot refund if payment not completed
    const blockedPaymentStatuses = ['PENDING', 'PROCESSING', 'FAILED'];
    if (blockedPaymentStatuses.includes(order.payment_status)) {
      return {
        valid: false,
        error: `Cannot initiate refund. Payment status is '${order.payment_status}'. Payment must be 'PAID' before a refund can be issued.`,
      };
    }
  }

  return { valid: true };
};

/**
 * Build RMA update payload based on the transition being made.
 */
const buildRMAUpdate = (nextStatus, body, reviewerId) => {
  const updates = {};

  if (nextStatus === 'RETURN_REQUESTED') {
    updates['rma.return_reason'] = body.return_reason.trim();
    updates['rma.requested_at'] = new Date();
  }

  if (nextStatus === 'RETURN_APPROVED') {
    updates['rma.reviewed_by'] = reviewerId;
    updates['rma.reviewed_at'] = new Date();
    updates['rma.refund_amount'] = body.refund_amount || null;
  }

  if (nextStatus === 'RETURN_REJECTED') {
    updates['rma.reviewed_by'] = reviewerId;
    updates['rma.reviewed_at'] = new Date();
    updates['rma.rejection_reason'] = body.rejection_reason.trim();
  }

  if (nextStatus === 'REFUNDED') {
    updates['rma.refunded_at'] = new Date();
    updates['payment_status'] = 'REFUNDED';
  }

  return updates;
};

module.exports = { validateTransition, buildRMAUpdate, TRANSITIONS };
