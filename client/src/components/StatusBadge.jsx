const STATUS_CONFIG = {
  PENDING:          { label: 'Pending',          emoji: '🕐' },
  PROCESSING:       { label: 'Processing',        emoji: '⚙️' },
  SHIPPED:          { label: 'Shipped',           emoji: '🚚' },
  DELIVERED:        { label: 'Delivered',         emoji: '✅' },
  RETURN_REQUESTED: { label: 'Return Requested',  emoji: '↩️' },
  RETURN_APPROVED:  { label: 'Return Approved',   emoji: '✔️' },
  RETURN_REJECTED:  { label: 'Rejected',          emoji: '✖️' },
  REFUND_INITIATED: { label: 'Refund Initiated',  emoji: '💳' },
  REFUNDED:         { label: 'Refunded',          emoji: '💚' },
};

const StatusBadge = ({ status, showDot = true }) => {
  const config = STATUS_CONFIG[status] || { label: status, emoji: '❓' };
  return (
    <span className={`status-badge badge-${status}`}>
      {showDot && <span className="dot" />}
      {config.label}
    </span>
  );
};

export default StatusBadge;
