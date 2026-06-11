import { useLocation } from 'react-router-dom';
import { usePendingRMAs } from '../api/useRMA';
import { useTheme } from '../contexts/ThemeContext';
import { useSocket } from '../contexts/SocketContext';

const PAGE_META = {
  '/dashboard': { title: 'Dashboard',  subtitle: 'Overview of RMA operations' },
  '/orders':    { title: 'Orders',     subtitle: 'Browse and manage all orders' },
  '/rma':       { title: 'RMA Queue',  subtitle: 'Pending returns awaiting action' },
  '/analytics': { title: 'Analytics',  subtitle: 'Trends, charts & insights' },
};

const Header = () => {
  const { pathname } = useLocation();
  const meta = PAGE_META[pathname] || { title: 'RMA Dashboard', subtitle: '' };
  const { data } = usePendingRMAs();
  const { theme, toggle } = useTheme();
  const socketCtx = useSocket();
  const isConnected = !!socketCtx?.socket?.current?.connected;
  const pendingCount = data?.count || 0;

  return (
    <header className="header">
      <div className="header-left">
        <div>
          <div className="header-title">{meta.title}</div>
          {meta.subtitle && <div className="header-subtitle">{meta.subtitle}</div>}
        </div>
      </div>

      <div className="header-right">
        {/* Live pending badge */}
        {pendingCount > 0 && (
          <div className="header-badge">
            <span className="status-dot" />
            {pendingCount} pending {pendingCount === 1 ? 'return' : 'returns'}
          </div>
        )}

        {/* Socket connection indicator */}
        <div className="connection-indicator" title={isConnected ? 'Real-time connected' : 'Connecting…'}>
          <span className={`connection-dot ${isConnected ? 'connected' : ''}`} />
          <span>{isConnected ? 'Live' : '…'}</span>
        </div>

        {/* Date */}
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {new Date().toLocaleDateString('en-IN', { dateStyle: 'medium' })}
        </div>

        {/* Theme toggle */}
        <button
          id="btn-theme-toggle"
          className="theme-toggle"
          onClick={toggle}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>
    </header>
  );
};

export default Header;
