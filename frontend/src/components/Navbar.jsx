import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-dark sticky-top">
      <div className="container">
        <Link className="navbar-brand d-flex align-items-center" to={user ? "/dashboard" : "/login"}>
          <i className="fas fa-lungs me-2 brand-icon-glow" style={{ color: '#14b8a6', fontSize: '1.6rem' }}></i>
          <span className="fw-extrabold text-white">
            Pneumo<span style={{ color: '#14b8a6' }}>Scan</span>
          </span>
        </Link>

        {user ? (
          <>
            <button
              className="navbar-toggler border-0 shadow-none"
              type="button"
              data-bs-toggle="collapse"
              data-bs-target="#navbarNav"
              aria-controls="navbarNav"
              aria-expanded="false"
              aria-label="Toggle navigation"
            >
              <span className="navbar-toggler-icon"></span>
            </button>
            <div className="collapse navbar-collapse" id="navbarNav">
              <div className="navbar-nav ms-auto align-items-center gap-1">
                <NavLink className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} to="/dashboard">
                  <i className="fas fa-home me-1"></i> Home
                </NavLink>
                <NavLink className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} to="/upload">
                  <i className="fas fa-cloud-upload-alt me-1"></i> Upload
                </NavLink>
                <NavLink className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} to="/results">
                  <i className="fas fa-chart-pie me-1"></i> Results
                </NavLink>

                <NavLink className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} to="/comparison">
                  <i className="fas fa-balance-scale me-1"></i> Comparison
                </NavLink>
                <NavLink className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} to="/feedback">
                  <i className="fas fa-comment-alt me-1"></i> Feedback
                </NavLink>

                {user.role === 'admin' && (
                  <NavLink className={({ isActive }) => `nav-link text-warning fw-semibold ${isActive ? 'active' : ''}`} to="/admin">
                    <i className="fas fa-user-shield me-1"></i> Admin
                  </NavLink>
                )}

                <div className="vr d-none d-lg-block mx-2 text-secondary opacity-50" style={{ height: '24px' }}></div>
                
                <span className="user-pill-badge d-inline-flex align-items-center me-2">
                  <i className="fas fa-user-circle me-1.5" style={{ color: '#14b8a6' }}></i>
                  {user.name}
                </span>

                <button onClick={handleLogout} className="btn btn-outline-danger btn-sm px-3">
                  <i className="fas fa-sign-out-alt me-1"></i>Logout
                </button>

                <button
                  onClick={toggleTheme}
                  className="btn btn-outline-light btn-sm ms-lg-2 my-1 my-lg-0 theme-toggle-btn"
                  type="button"
                  aria-label="Toggle theme"
                  title="Toggle Light/Dark Mode"
                >
                  <i className={`fas fa-${theme === 'dark' ? 'sun text-warning' : 'moon'} me-1`}></i>
                  <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="d-flex align-items-center ms-auto">
            <Link to="/login" className="btn btn-outline-light btn-sm me-2">
              Login
            </Link>
            <Link to="/register" className="btn btn-primary btn-sm me-3">
              Register
            </Link>
            <button
              onClick={toggleTheme}
              className="btn btn-outline-light btn-sm theme-toggle-btn"
              type="button"
              aria-label="Toggle theme"
              title="Toggle Light/Dark Mode"
            >
              <i className={`fas fa-${theme === 'dark' ? 'sun text-warning' : 'moon'} me-1`}></i>
              <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
