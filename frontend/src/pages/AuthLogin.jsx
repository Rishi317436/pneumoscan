import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import '../styles/auth.css';

const AuthLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { theme, toggleTheme } = useTheme();
  const { login } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const isLight = theme === 'light';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      addToast('Please enter your email or username', 'warning');
      return;
    }
    if (!password) {
      addToast('Please enter your password', 'warning');
      return;
    }

    setLoading(true);
    const res = await login(username.trim(), password);
    setLoading(false);

    if (res.success) {
      addToast(`Welcome back, ${res.user.name}`, 'success');
      navigate('/workspace');
    } else {
      addToast(res.message || 'Authentication failed. Please verify credentials.', 'error');
    }
  };

  return (
    <div className={`pneumo-auth-wrapper ${isLight ? 'theme-light' : 'theme-dark'}`}>
      {/* Top Header */}
      <header className="pneumo-auth-header">
        <div className="pneumo-brand">
          <div className="pneumo-brand-mark">P/</div>
          <div>
            <div className="pneumo-brand-title">
              Pneumo<span className="scan-accent">Scan</span>
            </div>
            <span className="pneumo-brand-tagline">CHEST X-RAY CAD & PACS WORKSPACE</span>
          </div>
        </div>

        {/* Instant Theme Toggle Switch */}
        <div 
          className="pneumo-theme-toggle" 
          onClick={toggleTheme} 
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && toggleTheme()}
          aria-label={isLight ? 'Switch to dark theme' : 'Switch to light theme'}
          title={isLight ? 'Switch to dark theme' : 'Switch to light theme'}
        >
          <span>{isLight ? '☀ Light' : '☾ Dark'}</span>
          <span className="pneumo-switch-track">
            <span className="pneumo-switch-thumb"></span>
          </span>
        </div>
      </header>

      {/* Main Content: Left-aligned glass card keeping the right-side glowing lung illustration fully prominent */}
      <div className="pneumo-auth-content">
        <div className="pneumo-card">
          <div className="pneumo-card-header">
            <div className="pneumo-title-divider">
              <span className="line"></span>
              <h2 className="pneumo-card-title">Login</h2>
              <span className="line"></span>
            </div>
            <p className="pneumo-card-subtitle">Access your clinical account to continue</p>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Input 1: Username / Email */}
            <div className="pneumo-form-group">
              <div className="pneumo-input-wrap">
                <i className="far fa-user pneumo-input-icon"></i>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pneumo-input"
                  placeholder="Enter your clinician username or email"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Input 2: Password */}
            <div className="pneumo-form-group">
              <div className="pneumo-input-wrap">
                <i className="fas fa-lock pneumo-input-icon"></i>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pneumo-input"
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="pneumo-input-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Toggle password visibility"
                >
                  <i className={`far ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>
              </div>
            </div>

            {/* Show Password Checkbox */}
            <div className="pneumo-checkbox-row">
              <label className="pneumo-checkbox-label">
                <input
                  type="checkbox"
                  checked={showPassword}
                  onChange={(e) => setShowPassword(e.target.checked)}
                  style={{ accentColor: 'var(--lightsaber-green)' }}
                />
                <span>Show password</span>
              </label>
            </div>

            {/* Lightsaber Glass Pill Button */}
            <button
              type="submit"
              disabled={loading}
              className="pneumo-btn-pill"
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Authenticating...
                </>
              ) : (
                <>
                  Login <span style={{ fontSize: '1.15rem', marginLeft: '4px' }}>&rarr;</span>
                </>
              )}
            </button>

            {/* Sign Up Footer Link */}
            <div className="pneumo-footer-link">
              Don't have an account? <Link to="/register">Sign Up</Link>
            </div>
          </form>
        </div>
      </div>

      {/* Footer copyright */}
      <footer className="pneumo-auth-footer">
        &copy; {new Date().getFullYear()} PNEUMOSCAN &bull; LIGHTSABER GLASS PACS CAD &bull; RESEARCH & CLINICAL SUPPORT
      </footer>
    </div>
  );
};

export default AuthLogin;
