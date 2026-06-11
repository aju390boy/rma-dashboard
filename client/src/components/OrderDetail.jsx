import { useState } from 'react';
import { format } from 'date-fns';
import { useOrder } from '../api/useOrders';
import { useAuditLog } from '../api/useRMA';
import StatusBadge from './StatusBadge';
import RMAPanel from './RMAPanel';

const OrderDetail = ({ orderId, onClose }) => {
  const { data: order, isLoading } = useOrder(orderId);
  const { data: auditLogs } = useAuditLog(orderId);
  const [activeTab, setActiveTab] = useState('details');

  if (isLoading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-body">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 16, marginBottom: 12, width: `${60 + Math.random() * 40}%` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!order) return null;

  const AUDIT_ICONS = {
    TRANSITION_TO_RETURN_REQUESTED: '↩️',
    TRANSITION_TO_RETURN_APPROVED:  '✔️',
    TRANSITION_TO_RETURN_REJECTED:  '✖️',
    TRANSITION_TO_REFUND_INITIATED: '💳',
    REFUND_PROCESSED:               '💚',
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="modal-title">
              <span className="order-number">{order.order_number}</span>
            </div>
            <div style={{ marginTop: 6 }}>
              <StatusBadge status={order.status} />
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {/* Tabs */}
        <div className="tabs" style={{ padding: '0 var(--space-6)', margin: 0 }}>
          {['details', 'products', 'rma', 'audit'].map((tab) => (
            <button
              key={tab}
              id={`tab-${tab}`}
              className={`tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'details' && '📋 Details'}
              {tab === 'products' && `📦 Products (${order.products?.length || 0})`}
              {tab === 'rma' && '↩️ RMA'}
              {tab === 'audit' && `🕐 Audit (${auditLogs?.length || 0})`}
            </button>
          ))}
        </div>

        <div className="modal-body">
          {/* ── Details Tab ── */}
          {activeTab === 'details' && (
            <>
              <div className="detail-grid">
                <div className="detail-item">
                  <div className="detail-label">Order Number</div>
                  <div className="detail-value order-number">{order.order_number}</div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">Total Amount</div>
                  <div className="detail-value" style={{ color: 'var(--success)', fontSize: 16, fontWeight: 700 }}>
                    ${order.total_amount?.toFixed(2)}
                  </div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">Payment Status</div>
                  <div className="detail-value">{order.payment_status}</div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">Created</div>
                  <div className="detail-value">{format(new Date(order.createdAt), 'dd MMM yyyy, HH:mm')}</div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">Last Updated</div>
                  <div className="detail-value">{format(new Date(order.updatedAt), 'dd MMM yyyy, HH:mm')}</div>
                </div>
              </div>

              <hr className="divider" />

              <div style={{ marginBottom: 'var(--space-3)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>
                Customer
              </div>
              {order.user_id && (
                <div className="detail-grid">
                  <div className="detail-item">
                    <div className="detail-label">Name</div>
                    <div className="detail-value">{order.user_id.name}</div>
                  </div>
                  <div className="detail-item">
                    <div className="detail-label">Email</div>
                    <div className="detail-value" style={{ fontSize: 13 }}>{order.user_id.email}</div>
                  </div>
                  <div className="detail-item">
                    <div className="detail-label">Wallet Balance</div>
                    <div className="detail-value" style={{ color: 'var(--success)' }}>
                      ${order.user_id.wallet_balance?.toFixed(2)}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── Products Tab ── */}
          {activeTab === 'products' && (
            <div className="products-list">
              {order.products?.map((p, i) => (
                <div key={i} className="product-item">
                  <img src={p.image_url} alt={p.name} className="product-img" onError={(e) => { e.target.style.display = 'none'; }} />
                  <div className="product-info">
                    <div className="product-name">{p.name}</div>
                    <div className="product-meta">ID: {p.product_id} · Qty: {p.quantity}</div>
                  </div>
                  <div className="product-price">${(p.price * p.quantity).toFixed(2)}</div>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--border-subtle)', fontWeight: 700, color: 'var(--text-primary)' }}>
                Total: <span style={{ color: 'var(--success)', marginLeft: 8 }}>${order.total_amount?.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* ── RMA Tab ── */}
          {activeTab === 'rma' && (
            <RMAPanel order={order} onClose={onClose} />
          )}

          {/* ── Audit Tab ── */}
          {activeTab === 'audit' && (
            <div>
              {!auditLogs || auditLogs.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📋</div>
                  <div className="empty-title">No audit entries</div>
                  <div className="empty-desc">Actions on this order will appear here</div>
                </div>
              ) : (
                <div className="timeline">
                  {auditLogs.map((log, i) => (
                    <div key={log._id || i} className="timeline-item">
                      <div className="timeline-dot">
                        {AUDIT_ICONS[log.action] || '📌'}
                      </div>
                      <div className="timeline-content">
                        <div className="timeline-action">{log.action.replace(/_/g, ' ')}</div>
                        <div className="timeline-meta">
                          by <strong>{log.performed_by?.name}</strong> ({log.performed_by?.role}) ·{' '}
                          {format(new Date(log.timestamp), 'dd MMM yyyy, HH:mm')}
                        </div>
                        {log.from_status && log.to_status && (
                          <div className="timeline-transition">
                            <StatusBadge status={log.from_status} />
                            <span className="arrow-icon">→</span>
                            <StatusBadge status={log.to_status} />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderDetail;
