import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { useAnalytics } from '../api/useAnalytics';
import { format, parseISO } from 'date-fns';

// ─── Color palette aligned with design system ─────────────────
const STATUS_COLORS = {
  PENDING:          '#f59e0b',
  PROCESSING:       '#3b82f6',
  SHIPPED:          '#8b5cf6',
  DELIVERED:        '#10b981',
  RETURN_REQUESTED: '#f97316',
  RETURN_APPROVED:  '#06b6d4',
  RETURN_REJECTED:  '#ef4444',
  REFUND_INITIATED: '#a78bfa',
  REFUNDED:         '#22c55e',
};
const CHART_COLORS = ['#6366f1','#06b6d4','#f59e0b','#ef4444','#22c55e','#a78bfa','#f97316'];

// ─── Custom Tooltip ────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label, prefix = '', suffix = '' }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-md)', padding: '10px 14px',
      boxShadow: 'var(--shadow-md)', fontSize: 12,
    }}>
      <p style={{ color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color, fontWeight: 600 }}>
          {p.name}: {prefix}{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}{suffix}
        </p>
      ))}
    </div>
  );
};

// ─── Skeleton chart placeholder ────────────────────────────────
const ChartSkeleton = ({ height = 240 }) => (
  <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div className="skeleton" style={{ width: '90%', height: height - 40, borderRadius: 8 }} />
  </div>
);

// ─── Main Analytics Page ───────────────────────────────────────
const Analytics = () => {
  const { data, isLoading } = useAnalytics();

  // Merge daily orders + revenue by date
  const dailyMerged = (() => {
    if (!data) return [];
    const map = {};
    (data.dailyOrders || []).forEach(d => { map[d._id] = { date: d._id, orders: d.orders, returns: d.returns, revenue: 0 }; });
    (data.dailyRevenue || []).forEach(d => { if (map[d._id]) map[d._id].revenue = d.revenue; else map[d._id] = { date: d._id, orders: 0, returns: 0, revenue: d.revenue }; });
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date)).map(d => ({
      ...d,
      dateLabel: format(parseISO(d.date), 'MMM d'),
      revenue: Math.round(d.revenue),
    }));
  })();

  const refundStats = data?.refundStats || {};
  const statusDist = data?.statusDistribution || [];
  const returnReasons = data?.returnReasons || [];
  const topProducts = data?.topReturnedProducts || [];
  const totalOrders = statusDist.reduce((s, d) => s + d.value, 0);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">30-day trends, return insights & refund metrics</p>
        </div>
      </div>

      {/* ── Summary Stats Row ── */}
      <div className="analytics-stat-row">
        <div className="analytics-stat">
          <div className="analytics-stat-val">{totalOrders.toLocaleString()}</div>
          <div className="analytics-stat-label">Total Orders</div>
        </div>
        <div className="analytics-stat">
          <div className="analytics-stat-val">${refundStats.totalRefunded?.toLocaleString('en', { maximumFractionDigits: 0 }) || 0}</div>
          <div className="analytics-stat-label">Total Refunded</div>
        </div>
        <div className="analytics-stat">
          <div className="analytics-stat-val">${refundStats.avgRefund?.toFixed(2) || '0.00'}</div>
          <div className="analytics-stat-label">Avg Refund Value</div>
        </div>
      </div>

      <div className="analytics-grid">

        {/* ── Chart 1: Daily Order & Return Volume (full width) ── */}
        <div className="chart-card analytics-grid-full">
          <div className="chart-header">
            <div>
              <div className="chart-title">📈 Order & Return Volume</div>
              <div className="chart-subtitle">Daily totals — last 30 days</div>
            </div>
          </div>
          <div className="chart-body">
            {isLoading ? <ChartSkeleton height={260} /> : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={dailyMerged} margin={{ left: 12, right: 20, top: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradOrders" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradReturns" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                  <XAxis dataKey="dateLabel" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="orders" name="Orders" stroke="#6366f1" strokeWidth={2} fill="url(#gradOrders)" dot={false} />
                  <Area type="monotone" dataKey="returns" name="Returns" stroke="#f97316" strokeWidth={2} fill="url(#gradReturns)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* ── Chart 2: Revenue Trend ── */}
        <div className="chart-card">
          <div className="chart-header">
            <div>
              <div className="chart-title">💰 Revenue Trend</div>
              <div className="chart-subtitle">Daily paid order revenue</div>
            </div>
          </div>
          <div className="chart-body">
            {isLoading ? <ChartSkeleton /> : (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={dailyMerged} margin={{ left: 12, right: 20, top: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                  <XAxis dataKey="dateLabel" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} interval={4} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} tickFormatter={v => `$${(v/1000).toFixed(1)}k`} />
                  <Tooltip content={<CustomTooltip prefix="$" />} />
                  <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#06b6d4" strokeWidth={2.5} fill="url(#gradRevenue)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* ── Chart 3: Order Status Pie ── */}
        <div className="chart-card">
          <div className="chart-header">
            <div>
              <div className="chart-title">🍩 Status Distribution</div>
              <div className="chart-subtitle">All orders by current status</div>
            </div>
          </div>
          <div className="chart-body">
            {isLoading ? <ChartSkeleton /> : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={statusDist}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                  >
                    {statusDist.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={STATUS_COLORS[entry.name] || '#6366f1'}
                        stroke="var(--bg-card)"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v, n) => [`${v} orders`, n.replace(/_/g, ' ')]}
                    contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 12 }}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    formatter={(v) => v.replace(/_/g, ' ')}
                    wrapperStyle={{ fontSize: 10 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* ── Chart 4: Return Reasons Bar ── */}
        <div className="chart-card">
          <div className="chart-header">
            <div>
              <div className="chart-title">↩ Top Return Reasons</div>
              <div className="chart-subtitle">Most common reasons filed</div>
            </div>
          </div>
          <div className="chart-body">
            {isLoading ? <ChartSkeleton /> : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart
                  data={returnReasons}
                  layout="vertical"
                  margin={{ left: 8, right: 24, top: 8, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
                  <YAxis
                    type="category"
                    dataKey="reason"
                    tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                    tickLine={false}
                    axisLine={false}
                    width={110}
                    tickFormatter={v => v.length > 18 ? v.slice(0, 17) + '…' : v}
                  />
                  <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="count" name="Returns" radius={[0, 4, 4, 0]}>
                    {returnReasons.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* ── Chart 5: Top Returned Products (full width) ── */}
        <div className="chart-card analytics-grid-full">
          <div className="chart-header">
            <div>
              <div className="chart-title">📦 Most Returned Products</div>
              <div className="chart-subtitle">Top 5 products by return volume</div>
            </div>
          </div>
          <div className="chart-body">
            {isLoading ? <ChartSkeleton height={200} /> : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={topProducts} margin={{ left: 12, right: 24, top: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false}
                    tickFormatter={v => v.length > 20 ? v.slice(0, 19) + '…' : v}
                  />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 12 }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="returns" name="Return Count" fill="#f97316" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Analytics;
