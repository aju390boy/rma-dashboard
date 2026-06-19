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

const Header = ({ onMenuClick }) => {
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
        {/* Hamburger — only visible on mobile */}
        <button
          className="hamburger-btn"
          onClick={onMenuClick}
          aria-label="Open menu"
        >
          <span /><span /><span />
        </button>

        <div>
          <div className="header-title">{meta.title}</div>
          {meta.subtitle && <div className="header-subtitle">{meta.subtitle}</div>}
        </div>
      </div>

      <div className="header-right">
        {/* Live pending badge — hidden on small phones */}
        {pendingCount > 0 && (
          <div className="header-badge header-badge--responsive">
            <span className="status-dot" />
            {pendingCount} pending {pendingCount === 1 ? 'return' : 'returns'}
          </div>
        )}

        {/* Socket connection indicator */}
        <div className="connection-indicator" title={isConnected ? 'Real-time connected' : 'Connecting…'}>
          <span className={`connection-dot ${isConnected ? 'connected' : ''}`} />
          <span className="connection-label">{isConnected ? 'Live' : '…'}</span>
        </div>

        {/* Date — hidden on small phones */}
        <div className="header-date">
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
