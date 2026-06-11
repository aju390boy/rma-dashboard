import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import { format } from 'date-fns';
import StatusBadge from './StatusBadge';
import FilterBar from './FilterBar';

const columnHelper = createColumnHelper();

const buildColumns = (onRowClick, filters, setFilters) => [
  columnHelper.accessor('order_number', {
    header: () => <SortHeader label="Order #" col="order_number" filters={filters} setFilters={setFilters} />,
    cell: (info) => <span className="order-number">{info.getValue()}</span>,
    size: 150,
  }),
  columnHelper.accessor('user_id', {
    header: 'Customer',
    cell: (info) => {
      const u = info.getValue();
      if (!u) return '—';
      const initials = u.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
      return (
        <div className="user-cell">
          <div className="user-mini-avatar">{initials}</div>
          <div>
            <div className="user-mini-name">{u.name}</div>
            <div className="user-mini-email">{u.email}</div>
          </div>
        </div>
      );
    },
    size: 200,
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: (info) => <StatusBadge status={info.getValue()} />,
    size: 160,
  }),
  columnHelper.accessor('payment_status', {
    header: 'Payment',
    cell: (info) => {
      const ps = info.getValue();
      const colors = { PAID: '#22c55e', FAILED: '#ef4444', PROCESSING: '#3b82f6', PENDING: '#f59e0b', REFUNDED: '#06b6d4' };
      return (
        <span style={{ color: colors[ps] || 'var(--text-secondary)', fontSize: 12, fontWeight: 600 }}>
          {ps}
        </span>
      );
    },
    size: 110,
  }),
  columnHelper.accessor('total_amount', {
    header: () => <SortHeader label="Amount" col="total_amount" filters={filters} setFilters={setFilters} />,
    cell: (info) => (
      <span className="amount">
        ${info.getValue()?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
    ),
    size: 110,
  }),
  columnHelper.accessor('products', {
    header: 'Items',
    cell: (info) => {
      const products = info.getValue();
      const total = products?.reduce((s, p) => s + p.quantity, 0) || 0;
      return <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{total} item{total !== 1 ? 's' : ''}</span>;
    },
    size: 80,
  }),
  columnHelper.accessor('createdAt', {
    header: () => <SortHeader label="Created" col="createdAt" filters={filters} setFilters={setFilters} />,
    cell: (info) => (
      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
        {format(new Date(info.getValue()), 'dd MMM yyyy')}
      </span>
    ),
    size: 110,
  }),
  columnHelper.accessor('updatedAt', {
    header: () => <SortHeader label="Updated" col="updatedAt" filters={filters} setFilters={setFilters} />,
    cell: (info) => (
      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
        {format(new Date(info.getValue()), 'dd MMM yyyy')}
      </span>
    ),
    size: 110,
  }),
];

const SortHeader = ({ label, col, filters, setFilters }) => {
  const isActive = filters.sortBy === col;
  const isAsc = filters.sortOrder === 'asc';

  const toggle = () => {
    if (isActive) {
      setFilters((f) => ({ ...f, sortOrder: isAsc ? 'desc' : 'asc', page: 1 }));
    } else {
      setFilters((f) => ({ ...f, sortBy: col, sortOrder: 'desc', page: 1 }));
    }
  };

  return (
    <span onClick={toggle} style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      {label}
      <span className={`sort-icon ${isActive ? 'active' : ''}`}>
        {isActive ? (isAsc ? '▲' : '▼') : '⇅'}
      </span>
    </span>
  );
};

const OrdersTable = ({ data, isLoading, filters, setFilters, onRowClick }) => {
  const { orders = [], pagination = {} } = data || {};

  const columns = buildColumns(onRowClick, filters, setFilters);

  const table = useReactTable({
    data: orders,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    pageCount: pagination.totalPages || 1,
  });

  const handlePageChange = (newPage) => {
    setFilters((f) => ({ ...f, page: newPage }));
  };

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <FilterBar filters={filters} onChange={setFilters} />

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <th key={h.id} style={{ width: h.column.getSize() }}>
                    {flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  {columns.map((_, j) => (
                    <td key={j}><div className="skeleton" /></td>
                  ))}
                </tr>
              ))
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  <div className="empty-state">
                    <div className="empty-icon">📭</div>
                    <div className="empty-title">No orders found</div>
                    <div className="empty-desc">Try adjusting your filters</div>
                  </div>
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => onRowClick(row.original)}
                  style={{ cursor: 'pointer' }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!isLoading && pagination.total > 0 && (
        <div className="pagination">
          <div className="pagination-info">
            Showing{' '}
            <strong>{(pagination.page - 1) * pagination.limit + 1}</strong>–
            <strong>{Math.min(pagination.page * pagination.limit, pagination.total)}</strong>{' '}
            of <strong>{pagination.total}</strong> orders
          </div>
          <div className="pagination-controls">
            <button
              id="btn-page-first"
              className="page-btn"
              disabled={pagination.page <= 1}
              onClick={() => handlePageChange(1)}
            >«</button>
            <button
              id="btn-page-prev"
              className="page-btn"
              disabled={pagination.page <= 1}
              onClick={() => handlePageChange(pagination.page - 1)}
            >‹</button>

            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
              let p;
              if (pagination.totalPages <= 5) {
                p = i + 1;
              } else if (pagination.page <= 3) {
                p = i + 1;
              } else if (pagination.page >= pagination.totalPages - 2) {
                p = pagination.totalPages - 4 + i;
              } else {
                p = pagination.page - 2 + i;
              }
              return (
                <button
                  key={p}
                  id={`btn-page-${p}`}
                  className={`page-btn ${p === pagination.page ? 'active' : ''}`}
                  onClick={() => handlePageChange(p)}
                >
                  {p}
                </button>
              );
            })}

            <button
              id="btn-page-next"
              className="page-btn"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => handlePageChange(pagination.page + 1)}
            >›</button>
            <button
              id="btn-page-last"
              className="page-btn"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => handlePageChange(pagination.totalPages)}
            >»</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersTable;
