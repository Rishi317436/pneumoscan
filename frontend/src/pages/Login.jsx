import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      if (result.user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } else {
      setErrorMsg(result.message || 'Login failed.');
    }
  };

  return (
    <div className="container py-4">
      {errorMsg && (
        <div className="alert alert-danger alert-dismissible fade show shadow-sm border-0">
          <i className="fas fa-exclamation-triangle me-2"></i>
          {errorMsg}
          <button type="button" className="btn-close" onClick={() => setErrorMsg('')}></button>
        </div>
      )}

      <div className="row justify-content-center mt-3 mt-md-4 mb-5">
        <div className="col-lg-10 col-xl-9">
          <div className="card shadow-lg border-0 overflow-hidden" style={{ borderRadius: '1.5rem' }}>
            <div className="row g-0">
              {/* Left Side: Modern Medical Gradient Overlay */}
              <div
                className="col-md-6 d-none d-md-flex align-items-center justify-content-center position-relative text-white hero-gradient-card"
                style={{
                  background: 'linear-gradient(135deg, #070d19 0%, #0f172a 50%, #0f766e 100%)',
                  minHeight: '480px'
                }}
              >
                <div className="position-relative text-center p-5 z-1">
                  <div
                    className="stat-icon-wrapper bg-white-10 mx-auto mb-3"
                    style={{
                      width: '72px',
                      height: '72px',
                      background: 'rgba(255,255,255,0.1)',
                      borderRadius: '1.25rem'
                    }}
                  >
                    <i className="fas fa-lungs brand-icon-glow" style={{ color: '#14b8a6', fontSize: '2.2rem' }}></i>
                  </div>
                  <h1 className="display-6 fw-extrabold mb-2 text-white">PneumoScan</h1>
                  <p className="fs-6 text-light opacity-90 mb-0">Advanced Chest X-Ray Diagnostic System</p>
                </div>
              </div>

              {/* Right Side: Login Form */}
              <div className="col-md-6 d-flex align-items-center bg-white">
                <div className="card-body p-4 p-md-5">
                  <h2 className="fw-extrabold mb-1 text-dark">Welcome Back 👋</h2>
                  <p className="text-muted mb-4 small">Please enter your details to sign in</p>

                  <form onSubmit={handleSubmit}>
                    <div className="mb-3">
                      <label className="form-label text-secondary fw-bold extra-small">Email Address</label>
                      <div className="input-group">
                        <span className="input-group-text bg-light text-muted">
                          <i className="fas fa-envelope"></i>
                        </span>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="form-control bg-light"
                          placeholder="name@domain.com"
                          required
                        />
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="form-label text-secondary fw-bold extra-small">Password</label>
                      <div className="input-group">
                        <span className="input-group-text bg-light text-muted">
                          <i className="fas fa-lock"></i>
                        </span>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="form-control bg-light"
                          placeholder="••••••••"
                          required
                        />
                        <button
                          type="button"
                          className="btn btn-outline-secondary toggle-password-btn"
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label="Toggle password visibility"
                        >
                          <i className={`fas fa-${showPassword ? 'eye-slash' : 'eye'}`}></i>
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="btn btn-primary w-100 py-3 fw-bold shadow-md"
                    >
                      {loading ? (
                        <span>
                          <span className="spinner-border spinner-border-sm me-2"></span>
                          Signing In...
                        </span>
                      ) : (
                        <>
                          <span>Sign In to Portal</span>
                          <i className="fas fa-arrow-right ms-2"></i>
                        </>
                      )}
                    </button>
                  </form>

                  <div className="text-center mt-4 pt-2">
                    <p className="text-muted small mb-0">
                      Don't have an account?{' '}
                      <Link to="/register" className="fw-bold text-teal" style={{ color: '#14b8a6' }}>
                        Register here
                      </Link>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
