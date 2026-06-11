import { useOrderStats } from '../api/useOrders';

const STAT_ITEMS = [
  {
    key: 'totalOrders',
    label: 'Total Orders',
    icon: '📦',
    color: '#6366f1',
    bg: 'rgba(99,102,241,0.12)',
    getValue: (d) => Object.values(d.statusBreakdown || {}).reduce((a, b) => a + b, 0),
  },
  {
    key: 'totalRevenue',
    label: 'Total Revenue',
    icon: '💰',
    color: '#22c55e',
    bg: 'rgba(34,197,94,0.12)',
    getValue: (d) => `$${(d.totalRevenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  },
  {
    key: 'pendingReturns',
    label: 'Pending Returns',
    icon: '↩️',
    color: '#f97316',
    bg: 'rgba(249,115,22,0.12)',
    getValue: (d) => d.pendingReturns || 0,
  },
  {
    key: 'delivered',
    label: 'Delivered',
    icon: '✅',
    color: '#10b981',
    bg: 'rgba(16,185,129,0.12)',
    getValue: (d) => d.statusBreakdown?.DELIVERED || 0,
  },
  {
    key: 'refunded',
    label: 'Refunded',
    icon: '💚',
    color: '#06b6d4',
    bg: 'rgba(6,182,212,0.12)',
    getValue: (d) => d.statusBreakdown?.REFUNDED || 0,
  },
  {
    key: 'rejected',
    label: 'Rejected',
    icon: '✖️',
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.12)',
    getValue: (d) => d.statusBreakdown?.RETURN_REJECTED || 0,
  },
];

const StatsCards = () => {
  const { data, isLoading } = useOrderStats();

  if (isLoading) {
    return (
      <div className="stats-grid">
        {STAT_ITEMS.map((s) => (
          <div key={s.key} className="stat-card">
            <div className="skeleton" style={{ height: 40, marginBottom: 12 }} />
            <div className="skeleton" style={{ height: 14, width: '60%' }} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="stats-grid">
      {STAT_ITEMS.map((item) => (
        <div key={item.key} className="stat-card">
          <div className="stat-card-header">
            <div className="stat-icon" style={{ background: item.bg, color: item.color }}>
              {item.icon}
            </div>
          </div>
          <div className="stat-value" style={{ color: item.color }}>
            {data ? item.getValue(data) : '—'}
          </div>
          <div className="stat-label">{item.label}</div>
        </div>
      ))}
    </div>
  );
};

export default StatsCards;
