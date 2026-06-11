import { useState, useEffect, useCallback } from 'react';

const ALL_STATUSES = [
  'PENDING','PROCESSING','SHIPPED','DELIVERED',
  'RETURN_REQUESTED','RETURN_APPROVED','RETURN_REJECTED',
  'REFUND_INITIATED','REFUNDED',
];

// Simple debounce hook
const useDebounce = (value, delay = 400) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
};

const FilterBar = ({ filters, onChange }) => {
  const [localSearch, setLocalSearch]   = useState(filters.search || '');
  const [localCustomer, setLocalCustomer] = useState(filters.customerName || '');

  const debouncedSearch   = useDebounce(localSearch,   400);
  const debouncedCustomer = useDebounce(localCustomer, 400);

  // Sync debounced values → parent
  useEffect(() => {
    if (debouncedSearch !== (filters.search || '')) {
      onChange((f) => ({ ...f, search: debouncedSearch, page: 1 }));
    }
  }, [debouncedSearch]);

  useEffect(() => {
    if (debouncedCustomer !== (filters.customerName || '')) {
      onChange((f) => ({ ...f, customerName: debouncedCustomer, page: 1 }));
    }
  }, [debouncedCustomer]);

  const handleChange = (key, value) =>
    onChange((f) => ({ ...f, [key]: value, page: 1 }));

  const hasActiveFilters =
    filters.status || filters.search || filters.startDate ||
    filters.endDate || filters.payment_status || filters.customerName;

  const clearAll = () => {
    setLocalSearch('');
    setLocalCustomer('');
    onChange((f) => ({ page: 1, limit: f.limit, sortBy: f.sortBy, sortOrder: f.sortOrder }));
  };

  return (
    <div className="filter-bar">
      {/* Order number search */}
      <div className="search-wrapper">
        <span className="search-icon">🔍</span>
        <input
          id="filter-search"
          type="text"
          className="filter-input"
          placeholder="Search order #..."
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
        />
      </div>

      {/* Customer name search (debounced) */}
      <div className="search-wrapper">
        <span className="search-icon">👤</span>
        <input
          id="filter-customer-name"
          type="text"
          className="filter-input"
          placeholder="Search customer..."
          value={localCustomer}
          onChange={(e) => setLocalCustomer(e.target.value)}
        />
      </div>

      {/* Status */}
      <select
        id="filter-status"
        className="filter-select"
        value={filters.status || ''}
        onChange={(e) => handleChange('status', e.target.value)}
      >
        <option value="">All Statuses</option>
        {ALL_STATUSES.map((s) => (
          <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
        ))}
      </select>

      {/* Payment status */}
      <select
        id="filter-payment"
        className="filter-select"
        value={filters.payment_status || ''}
        onChange={(e) => handleChange('payment_status', e.target.value)}
      >
        <option value="">All Payments</option>
        {['PENDING','PROCESSING','PAID','FAILED','REFUNDED'].map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      {/* Date range */}
      <div className="filter-date-group">
        <input id="filter-start-date" type="date" className="filter-input"
          value={filters.startDate || ''}
          onChange={(e) => handleChange('startDate', e.target.value)}
          style={{ width: 138 }}
        />
        <span className="filter-date-sep">→</span>
        <input id="filter-end-date" type="date" className="filter-input"
          value={filters.endDate || ''}
          onChange={(e) => handleChange('endDate', e.target.value)}
          style={{ width: 138 }}
        />
      </div>

      {hasActiveFilters && (
        <button id="btn-clear-filters" className="btn-clear-filter" onClick={clearAll}>
          ✕ Clear
        </button>
      )}
    </div>
  );
};

export default FilterBar;
