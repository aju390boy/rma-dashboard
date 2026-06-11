import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const DEMO_CREDS = [
  { role: 'Admin', email: 'admin@rma.dev', password: 'Admin@123', color: 'var(--accent-primary)' },
  { role: 'Support', email: 'support@rma.dev', password: 'Support@123', color: 'var(--accent-secondary)' },
];

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillCred = (cred) => {
    setEmail(cred.email);
    setPassword(cred.password);
    setError('');
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">↩</div>
        <h1 className="login-title">RMA Dashboard</h1>
        <p className="login-subtitle">Internal Returns Management System</p>

        {/* Demo credentials */}
        <div className="demo-creds">
          <div className="demo-creds-title">⚡ Quick Login — Click to fill</div>
          {DEMO_CREDS.map((cred) => (
            <div
              key={cred.role}
              className="demo-cred-item"
              onClick={() => fillCred(cred)}
              id={`demo-cred-${cred.role.toLowerCase()}`}
            >
              <div>
                <div className="demo-cred-role" style={{ color: cred.color }}>{cred.role}</div>
                <div className="demo-cred-email">{cred.email}</div>
              </div>
              <div className="demo-cred-hint">click →</div>
            </div>
          ))}
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@rma.dev"
              required
              autoComplete="email"
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>
          <button
            id="btn-login"
            type="submit"
            className="btn-login"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner" style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white' }} />
                Signing in...
              </>
            ) : (
              '→ Sign In'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
