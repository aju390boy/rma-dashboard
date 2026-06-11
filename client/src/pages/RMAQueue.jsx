import { useState } from 'react';
import { usePendingRMAs } from '../api/useRMA';
import StatusBadge from '../components/StatusBadge';
import OrderDetail from '../components/OrderDetail';
import { format } from 'date-fns';

const RMAQueue = () => {
  const { data, isLoading, refetch } = usePendingRMAs();
  const [selectedOrderId, setSelectedOrderId] = useState(null);

  const orders = data?.orders || [];

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">RMA Queue</h1>
          <p className="page-subtitle">
            {isLoading ? 'Loading...' : `${orders.length} order${orders.length !== 1 ? 's' : ''} requiring action`}
          </p>
        </div>
        <button className="btn btn-ghost" onClick={() => refetch()}>↺ Refresh</button>
      </div>

      {isLoading ? (
        <div className="card">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--border-subtle)' }}>
              <div className="skeleton" style={{ height: 16, width: '40%', marginBottom: 8 }} />
              <div className="skeleton" style={{ height: 12, width: '60%' }} />
            </div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="card">
          <div className="empty-state" style={{ padding: 'var(--space-12)' }}>
            <div className="empty-icon">🎉</div>
            <div className="empty-title">Queue is empty!</div>
            <div className="empty-desc">No returns are currently awaiting action. Great work!</div>
          </div>
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Return Reason</th>
                <th>Amount</th>
                <th>Days Waiting</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const daysWaiting = order.rma?.requested_at
                  ? Math.floor((Date.now() - new Date(order.rma.requested_at)) / 86400000)
                  : 0;
                const isUrgent = daysWaiting >= 3;

                return (
                  <tr key={order._id}>
                    <td><span className="order-number">{order.order_number}</span></td>
                    <td>
                      <div className="user-cell">
                        <div className="user-mini-avatar">
                          {order.user_id?.name?.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
                        </div>
                        <div>
                          <div className="user-mini-name">{order.user_id?.name}</div>
                          <div className="user-mini-email">{order.user_id?.email}</div>
                        </div>
                      </div>
                    </td>
                    <td><StatusBadge status={order.status} /></td>
                    <td>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)', maxWidth: 200, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {order.rma?.return_reason || '—'}
                      </span>
                    </td>
                    <td><span className="amount">${order.total_amount?.toFixed(2)}</span></td>
                    <td>
                      <span style={{ color: isUrgent ? 'var(--error)' : 'var(--text-muted)', fontSize: 12, fontWeight: isUrgent ? 700 : 400 }}>
                        {isUrgent ? '🔥 ' : ''}{daysWaiting}d
                      </span>
                    </td>
                    <td>
                      <button
                        id={`btn-review-${order._id}`}
                        className="btn btn-primary btn-sm"
                        onClick={() => setSelectedOrderId(order._id)}
                      >
                        Review →
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selectedOrderId && (
        <OrderDetail
          orderId={selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
        />
      )}
    </div>
  );
};

export default RMAQueue;
