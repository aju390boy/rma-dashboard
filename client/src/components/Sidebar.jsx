import { NavLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { usePendingRMAs } from '../api/useRMA';

const NAV_ITEMS = [
  { to: '/dashboard', icon: '📊', label: 'Dashboard' },
  { to: '/orders',    icon: '📦', label: 'All Orders' },
  { to: '/rma',       icon: '↩️',  label: 'RMA Queue', badge: true },
  { to: '/analytics', icon: '📈', label: 'Analytics' },
];

const Sidebar = () => {
  const { user, logout } = useAuth();
  const { data } = usePendingRMAs();
  const pendingCount = data?.count || 0;
  const initials = user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??';

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">↩</div>
        <div className="sidebar-logo-text">
          <span className="sidebar-logo-title">RMA Desk</span>
          <span className="sidebar-logo-sub">Returns Management</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <span className="sidebar-section-label">Navigation</span>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `sidebar-nav-item${isActive ? ' active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            {item.label}
            {item.badge && pendingCount > 0 && (
              <span className="nav-badge">{pendingCount}</span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="user-avatar">{initials}</div>
          <div className="user-info">
            <div className="user-name">{user?.name}</div>
            <div className={`user-role ${user?.role}`}>{user?.role}</div>
          </div>
          <button className="logout-btn" onClick={logout} title="Logout">⎋</button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
