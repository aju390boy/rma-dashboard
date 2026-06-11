import { useState } from 'react';
import StatsCards from '../components/StatsCards';
import { useOrderStats } from '../api/useOrders';
import { usePendingRMAs } from '../api/useRMA';
import StatusBadge from '../components/StatusBadge';
import OrderDetail from '../components/OrderDetail';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const { data: stats } = useOrderStats();
  const { data: pendingRMAs } = usePendingRMAs();
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const navigate = useNavigate();

  const statusBreakdown = stats?.statusBreakdown || {};

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Real-time overview of your RMA operations</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/orders')}>
          View All Orders →
        </button>
      </div>

      {/* KPI Stats */}
      <StatsCards />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-5)' }}>
        {/* Status Breakdown */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">📊 Order Status Breakdown</div>
          </div>
          <div className="card-body" style={{ padding: 'var(--space-4)' }}>
            {Object.entries(statusBreakdown).map(([status, count]) => {
              const total = Object.values(statusBreakdown).reduce((a, b) => a + b, 0);
              const pct = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
              return (
                <div key={status} style={{ marginBottom: 'var(--space-3)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <StatusBadge status={status} />
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{count} ({pct}%)</span>
                  </div>
                  <div style={{
                    height: 4, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-full)', overflow: 'hidden'
                  }}>
                    <div style={{
                      height: '100%', width: `${pct}%`,
                      background: 'var(--accent-gradient)',
                      borderRadius: 'var(--radius-full)',
                      transition: 'width 1s var(--ease-out)',
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pending RMA Queue */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">⚡ Pending Action Required</div>
            {pendingRMAs?.count > 0 && (
              <span className="nav-badge" style={{ marginLeft: 0 }}>{pendingRMAs.count}</span>
            )}
          </div>
          <div style={{ maxHeight: 340, overflowY: 'auto' }}>
            {!pendingRMAs?.orders?.length ? (
              <div className="empty-state" style={{ padding: 'var(--space-8)' }}>
                <div className="empty-icon">🎉</div>
                <div className="empty-title">All clear!</div>
                <div className="empty-desc">No pending returns to review</div>
              </div>
            ) : (
              pendingRMAs.orders.map((order) => (
                <div
                  key={order._id}
                  onClick={() => setSelectedOrderId(order._id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                    padding: 'var(--space-3) var(--space-5)',
                    borderBottom: '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    transition: 'background var(--duration-fast)',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ flex: 1 }}>
                    <div className="order-number" style={{ fontSize: 12 }}>{order.order_number}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      {order.user_id?.name} · ${order.total_amount?.toFixed(2)}
                    </div>
                  </div>
                  <StatusBadge status={order.status} />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent RMA Activity */}
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <div className="card-header">
            <div className="card-title">🕐 Recent Activity</div>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {!stats?.recentActivity?.length ? (
              <div className="empty-state">
                <div className="empty-icon">📭</div>
                <div className="empty-title">No recent activity</div>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Status</th>
                    <th>Amount</th>
                    <th>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentActivity.map((order) => (
                    <tr key={order._id} onClick={() => setSelectedOrderId(order._id)} style={{ cursor: 'pointer' }}>
                      <td><span className="order-number">{order.order_number}</span></td>
                      <td>{order.user_id?.name || '—'}</td>
                      <td><StatusBadge status={order.status} /></td>
                      <td><span className="amount">${order.total_amount?.toFixed(2)}</span></td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {format(new Date(order.updatedAt), 'dd MMM, HH:mm')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {selectedOrderId && (
        <OrderDetail orderId={selectedOrderId} onClose={() => setSelectedOrderId(null)} />
      )}
    </div>
  );
};

export default Dashboard;
