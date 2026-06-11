/**
 * UNIT TESTS — State Machine (stateMachine.js)
 * No database required — pure logic tests.
 */
const { validateTransition, buildRMAUpdate, TRANSITIONS } = require('../../services/stateMachine');

// Mock order object used across tests
const mockOrder = (overrides = {}) => ({
  status: 'DELIVERED',
  payment_status: 'PAID',
  total_amount: 1000,
  ...overrides,
});

describe('FSM — TRANSITIONS map', () => {
  it('defines all 9 order states', () => {
    const states = Object.keys(TRANSITIONS);
    expect(states).toHaveLength(9);
    expect(states).toContain('PENDING');
    expect(states).toContain('REFUNDED');
  });

  it('RETURN_REJECTED and REFUNDED are terminal (no outgoing transitions)', () => {
    expect(TRANSITIONS.RETURN_REJECTED).toHaveLength(0);
    expect(TRANSITIONS.REFUNDED).toHaveLength(0);
  });
});

describe('FSM — validateTransition: valid paths', () => {
  it('✅ PENDING → PROCESSING (admin)', () => {
    const result = validateTransition('PENDING', 'PROCESSING', 'admin', mockOrder({ status: 'PENDING' }));
    expect(result.valid).toBe(true);
  });

  it('✅ PROCESSING → SHIPPED (support)', () => {
    const result = validateTransition('PROCESSING', 'SHIPPED', 'support', mockOrder({ status: 'PROCESSING' }));
    expect(result.valid).toBe(true);
  });

  it('✅ SHIPPED → DELIVERED (admin)', () => {
    const result = validateTransition('SHIPPED', 'DELIVERED', 'admin', mockOrder({ status: 'SHIPPED' }));
    expect(result.valid).toBe(true);
  });

  it('✅ DELIVERED → RETURN_REQUESTED with return_reason (customer)', () => {
    const result = validateTransition(
      'DELIVERED', 'RETURN_REQUESTED', 'customer',
      mockOrder(), { return_reason: 'Product damaged' }
    );
    expect(result.valid).toBe(true);
  });

  it('✅ RETURN_REQUESTED → RETURN_APPROVED (support)', () => {
    const result = validateTransition(
      'RETURN_REQUESTED', 'RETURN_APPROVED', 'support',
      mockOrder({ status: 'RETURN_REQUESTED' })
    );
    expect(result.valid).toBe(true);
  });

  it('✅ RETURN_REQUESTED → RETURN_REJECTED with rejection_reason (admin)', () => {
    const result = validateTransition(
      'RETURN_REQUESTED', 'RETURN_REJECTED', 'admin',
      mockOrder({ status: 'RETURN_REQUESTED' }),
      { rejection_reason: 'Outside return window' }
    );
    expect(result.valid).toBe(true);
  });

  it('✅ RETURN_APPROVED → REFUND_INITIATED (admin, payment PAID)', () => {
    const result = validateTransition(
      'RETURN_APPROVED', 'REFUND_INITIATED', 'admin',
      mockOrder({ status: 'RETURN_APPROVED', payment_status: 'PAID' })
    );
    expect(result.valid).toBe(true);
  });
});

describe('FSM — validateTransition: invalid paths', () => {
  it('❌ PENDING → REFUNDED (skipping states)', () => {
    const result = validateTransition('PENDING', 'REFUNDED', 'admin', mockOrder({ status: 'PENDING' }));
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/Cannot transition from PENDING to REFUNDED/);
  });

  it('❌ DELIVERED → RETURN_REQUESTED without return_reason', () => {
    const result = validateTransition('DELIVERED', 'RETURN_REQUESTED', 'customer', mockOrder(), {});
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/return_reason is required/);
  });

  it('❌ DELIVERED → RETURN_REQUESTED with empty return_reason', () => {
    const result = validateTransition('DELIVERED', 'RETURN_REQUESTED', 'customer', mockOrder(), { return_reason: '   ' });
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/return_reason is required/);
  });

  it('❌ RETURN_REQUESTED → RETURN_REJECTED without rejection_reason', () => {
    const result = validateTransition(
      'RETURN_REQUESTED', 'RETURN_REJECTED', 'admin',
      mockOrder({ status: 'RETURN_REQUESTED' }), {}
    );
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/rejection_reason is required/);
  });

  it('❌ REFUNDED → any state (terminal state)', () => {
    const result = validateTransition('REFUNDED', 'RETURN_REQUESTED', 'admin', mockOrder({ status: 'REFUNDED' }));
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/terminal state/);
  });

  it('❌ RETURN_REJECTED → any state (terminal state)', () => {
    const result = validateTransition('RETURN_REJECTED', 'RETURN_APPROVED', 'admin', mockOrder());
    expect(result.valid).toBe(false);
  });
});

describe('FSM — Role guards', () => {
  it('❌ support cannot trigger REFUND_INITIATED (admin only)', () => {
    const result = validateTransition(
      'RETURN_APPROVED', 'REFUND_INITIATED', 'support',
      mockOrder({ status: 'RETURN_APPROVED', payment_status: 'PAID' })
    );
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/not authorized/);
  });

  it('❌ customer cannot approve return (support/admin only)', () => {
    const result = validateTransition(
      'RETURN_REQUESTED', 'RETURN_APPROVED', 'customer',
      mockOrder({ status: 'RETURN_REQUESTED' })
    );
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/not authorized/);
  });

  it('✅ admin CAN trigger REFUND_INITIATED', () => {
    const result = validateTransition(
      'RETURN_APPROVED', 'REFUND_INITIATED', 'admin',
      mockOrder({ status: 'RETURN_APPROVED', payment_status: 'PAID' })
    );
    expect(result.valid).toBe(true);
  });
});

describe('FSM — Payment guard on REFUND_INITIATED', () => {
  const paymentBlockedStatuses = ['PENDING', 'PROCESSING', 'FAILED'];

  paymentBlockedStatuses.forEach((paymentStatus) => {
    it(`❌ blocks REFUND_INITIATED when payment_status is ${paymentStatus}`, () => {
      const result = validateTransition(
        'RETURN_APPROVED', 'REFUND_INITIATED', 'admin',
        mockOrder({ status: 'RETURN_APPROVED', payment_status: paymentStatus })
      );
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/Payment status is/);
    });
  });
});

describe('FSM — buildRMAUpdate', () => {
  it('sets rma.return_reason and requested_at for RETURN_REQUESTED', () => {
    const updates = buildRMAUpdate('RETURN_REQUESTED', { return_reason: 'Broken' }, 'userId');
    expect(updates['rma.return_reason']).toBe('Broken');
    expect(updates['rma.requested_at']).toBeInstanceOf(Date);
  });

  it('sets reviewer fields for RETURN_APPROVED', () => {
    const updates = buildRMAUpdate('RETURN_APPROVED', { refund_amount: 500 }, 'reviewerId');
    expect(updates['rma.reviewed_by']).toBe('reviewerId');
    expect(updates['rma.refund_amount']).toBe(500);
    expect(updates['rma.reviewed_at']).toBeInstanceOf(Date);
  });

  it('sets rejection_reason for RETURN_REJECTED', () => {
    const updates = buildRMAUpdate('RETURN_REJECTED', { rejection_reason: 'Outside window' }, 'reviewerId');
    expect(updates['rma.rejection_reason']).toBe('Outside window');
  });

  it('sets refunded_at and payment_status REFUNDED for REFUNDED', () => {
    const updates = buildRMAUpdate('REFUNDED', {}, 'adminId');
    expect(updates['rma.refunded_at']).toBeInstanceOf(Date);
    expect(updates['payment_status']).toBe('REFUNDED');
  });
});
