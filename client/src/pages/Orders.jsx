import { useState } from 'react';
import { useOrders } from '../api/useOrders';
import OrdersTable from '../components/OrdersTable';
import OrderDetail from '../components/OrderDetail';

const DEFAULT_FILTERS = {
  page: 1,
  limit: 20,
  sortBy: 'createdAt',
  sortOrder: 'desc',
};

const Orders = () => {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [selectedOrderId, setSelectedOrderId] = useState(null);

  const { data, isLoading, isFetching } = useOrders(filters);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Orders</h1>
          <p className="page-subtitle">
            {data?.pagination?.total
              ? `${data.pagination.total.toLocaleString()} total orders`
              : 'Browse and manage all orders'}
          </p>
        </div>
        {isFetching && !isLoading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-muted)' }}>
            <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
            Updating...
          </div>
        )}
      </div>

      <OrdersTable
        data={data}
        isLoading={isLoading}
        filters={filters}
        setFilters={setFilters}
        onRowClick={(order) => setSelectedOrderId(order._id)}
      />

      {selectedOrderId && (
        <OrderDetail
          orderId={selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
        />
      )}
    </div>
  );
};

export default Orders;
