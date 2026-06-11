import { useState } from 'react';
import { format } from 'date-fns';
import { useTransitionOrder } from '../api/useRMA';
import { useAuth } from '../auth/AuthContext';
import StatusBadge from './StatusBadge';

const NEXT_ACTIONS = {
  DELIVERED:        [{ status: 'RETURN_REQUESTED', label: 'Request Return', variant: 'btn-ghost' }],
  RETURN_REQUESTED: [
    { status: 'RETURN_APPROVED', label: '✔ Approve Return', variant: 'btn-success', roles: ['admin', 'support'] },
    { status: 'RETURN_REJECTED', label: '✖ Reject Return',  variant: 'btn-danger',  roles: ['admin', 'support'] },
  ],
  RETURN_APPROVED:  [
    { status: 'REFUND_INITIATED', label: '💳 Initiate Refund', variant: 'btn-primary', roles: ['admin'] },
  ],
  REFUND_INITIATED: [
    { status: 'REFUNDED', label: '💚 Mark Refunded', variant: 'btn-success', roles: ['admin'] },
  ],
};

const RMAPanel = ({ order, onClose }) => {
  const { user, isAdmin, isSupport } = useAuth();
  const { mutate: transition, isPending, error, reset } = useTransitionOrder();

  const [form, setForm] = useState({
    return_reason: '',
    rejection_reason: '',
    refund_amount: order?.total_amount || '',
  });
  const [activeAction, setActiveAction] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  const actions = NEXT_ACTIONS[order?.status] || [];
  const allowedActions = actions.filter((a) => !a.roles || a.roles.includes(user?.role));

  const handleAction = (action) => {
    reset();
    setSuccessMsg('');
    setActiveAction(action);
  };

  const handleSubmit = () => {
    if (!activeAction) return;

    transition(
      {
        orderId: order._id,
        nextStatus: activeAction.status,
        ...form,
      },
      {
        onSuccess: () => {
          setSuccessMsg(`✅ Order successfully transitioned to ${activeAction.status.replace(/_/g, ' ')}`);
          setActiveAction(null);
        },
      }
    );
  };

  const needsReturnReason = activeAction?.status === 'RETURN_REQUESTED';
  const needsRejectionReason = activeAction?.status === 'RETURN_REJECTED';
  const needsRefundAmount = activeAction?.status === 'RETURN_APPROVED' || activeAction?.status === 'REFUND_INITIATED';

  const isBlocked =
    activeAction?.status === 'REFUND_INITIATED' &&
    ['PENDING', 'PROCESSING', 'FAILED'].includes(order?.payment_status);

  return (
    <div className="rma-section">
      <div className="rma-section-title">↩ RMA Workflow</div>

      {/* Current RMA data */}
      {order?.rma?.return_reason && (
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <div className="detail-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="detail-item">
              <div className="detail-label">Return Reason</div>
              <div className="detail-value" style={{ fontSize: 13 }}>{order.rma.return_reason}</div>
            </div>
            {order.rma.requested_at && (
              <div className="detail-item">
                <div className="detail-label">Requested At</div>
                <div className="detail-value" style={{ fontSize: 13 }}>
                  {format(new Date(order.rma.requested_at), 'dd MMM yyyy, HH:mm')}
                </div>
              </div>
            )}
            {order.rma.rejection_reason && (
              <div className="detail-item">
                <div className="detail-label">Rejection Reason</div>
                <div className="detail-value" style={{ fontSize: 13, color: 'var(--error)' }}>
                  {order.rma.rejection_reason}
                </div>
              </div>
            )}
            {order.rma.refund_amount && (
              <div className="detail-item">
                <div className="detail-label">Refund Amount</div>
                <div className="detail-value" style={{ fontSize: 13, color: 'var(--success)' }}>
                  ${order.rma.refund_amount?.toFixed(2)}
                </div>
              </div>
            )}
            {order.rma.reviewed_by && (
              <div className="detail-item">
                <div className="detail-label">Reviewed By</div>
                <div className="detail-value" style={{ fontSize: 13 }}>{order.rma.reviewed_by?.name}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Success message */}
      {successMsg && (
        <div className="alert alert-success" style={{ marginBottom: 'var(--space-3)' }}>
          {successMsg}
        </div>
      )}

      {/* Payment block warning */}
      {isBlocked && (
        <div className="alert alert-warning">
          ⚠️ Cannot initiate refund — payment status is <strong>{order.payment_status}</strong>.
          Payment must be <strong>PAID</strong> before refund.
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="alert alert-error">
          ❌ {error.response?.data?.message || error.message}
        </div>
      )}

      {/* Action buttons */}
      {allowedActions.length > 0 && (
        <div className="rma-actions">
          {allowedActions.map((action) => (
            <button
              key={action.status}
              id={`btn-action-${action.status}`}
              className={`btn ${action.variant} btn-sm`}
              onClick={() => handleAction(action)}
              disabled={isPending}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}

      {/* Inline form for the selected action */}
      {activeAction && (
        <div style={{ marginTop: 'var(--space-4)', padding: 'var(--space-4)', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)' }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 'var(--space-3)', color: 'var(--text-accent)' }}>
            Transition to: {activeAction.status.replace(/_/g, ' ')}
          </div>

          {needsReturnReason && (
            <div className="form-group">
              <label className="form-label">Return Reason *</label>
              <textarea
                className="form-textarea"
                value={form.return_reason}
                onChange={(e) => setForm((f) => ({ ...f, return_reason: e.target.value }))}
                placeholder="Describe the reason for return..."
              />
            </div>
          )}

          {needsRejectionReason && (
            <div className="form-group">
              <label className="form-label">Rejection Reason *</label>
              <textarea
                className="form-textarea"
                value={form.rejection_reason}
                onChange={(e) => setForm((f) => ({ ...f, rejection_reason: e.target.value }))}
                placeholder="Explain why this return is rejected..."
              />
            </div>
          )}

          {needsRefundAmount && (
            <div className="form-group">
              <label className="form-label">Refund Amount ($)</label>
              <input
                type="number"
                className="form-input"
                value={form.refund_amount}
                onChange={(e) => setForm((f) => ({ ...f, refund_amount: e.target.value }))}
                min="0"
                max={order.total_amount}
                step="0.01"
              />
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                Order total: ${order.total_amount?.toFixed(2)}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            <button
              id="btn-confirm-transition"
              className="btn btn-primary btn-sm"
              onClick={handleSubmit}
              disabled={isPending || isBlocked}
            >
              {isPending ? '⏳ Processing...' : 'Confirm'}
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => { setActiveAction(null); reset(); }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Terminal state */}
      {['REFUNDED', 'RETURN_REJECTED'].includes(order?.status) && !activeAction && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 'var(--space-3)' }}>
          ⚑ This order has reached a terminal state.
        </div>
      )}
    </div>
  );
};

export default RMAPanel;
