import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';

const RadiologyNavbar = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { addToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  const isLight = theme === 'light';
  const [activeSection, setActiveSection] = useState('workstation');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu on route or hash change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname, location.hash]);

  // Close mobile menu on ESC
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Track scroll position to update active section indicator with rAF throttling
  useEffect(() => {
    if (location.pathname !== '/workspace') return;

    const sections = ['workstation', 'analytics', 'studies', 'feedback'];
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollPosition = window.scrollY + 200;

          for (let i = sections.length - 1; i >= 0; i--) {
            const el = document.getElementById(sections[i]);
            if (el && el.offsetTop <= scrollPosition) {
              setActiveSection((prev) => (prev !== sections[i] ? sections[i] : prev));
              break;
            }
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [location.pathname]);

  const scrollToSection = (sectionId) => {
    setActiveSection(sectionId);
    setMobileMenuOpen(false);
    if (location.pathname !== '/workspace') {
      navigate(`/workspace#${sectionId}`);
      setTimeout(() => {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
      }, 150);
    } else {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleLogout = async () => {
    setMobileMenuOpen(false);
    await logout();
    addToast('Logged out of PneumoScan Workspace', 'info');
    navigate('/login');
  };

  return (
    <>
      <header className="rad-header d-print-none">
        <div className="container-fluid d-flex align-items-center justify-content-between px-2 px-sm-3 px-lg-4">
          {/* Brand */}
          <Link className="rad-brand-logo" to={user ? "/workspace" : "/login"}>
            <div className="rad-logo-icon">
              <i className="fas fa-lungs"></i>
            </div>
            <div>
              <span className="fw-extrabold text-white">Pneumo<span style={{ color: 'var(--rad-cyan, #39ff14)' }}>Scan</span></span>
              <span className="text-secondary extra-small fw-semibold ms-2 d-none d-md-inline" style={{ fontSize: '0.75rem', letterSpacing: '0.04em' }}>
                CHEST X-RAY CAD & PACS
              </span>
            </div>
          </Link>

          {/* Navigation & Controls */}
          {user ? (
            <div className="d-flex align-items-center gap-1.5 gap-sm-2">
              {/* Desktop Nav Links */}
              <nav className="d-none d-lg-flex align-items-center gap-1">
                <button
                  type="button"
                  onClick={() => scrollToSection('workstation')}
                  className={`rad-nav-link border-0 bg-transparent cursor-pointer ${location.pathname === '/workspace' && activeSection === 'workstation' ? 'active' : ''}`}
                >
                  <i className="fas fa-desktop"></i> Workstation
                </button>

                <button
                  type="button"
                  onClick={() => scrollToSection('analytics')}
                  className={`rad-nav-link border-0 bg-transparent cursor-pointer ${location.pathname === '/workspace' && activeSection === 'analytics' ? 'active' : ''}`}
                >
                  <i className="fas fa-chart-line"></i> Analytics
                </button>

                <button
                  type="button"
                  onClick={() => scrollToSection('studies')}
                  className={`rad-nav-link border-0 bg-transparent cursor-pointer ${location.pathname === '/workspace' && activeSection === 'studies' ? 'active' : ''}`}
                >
                  <i className="fas fa-list-alt"></i> Chest X-Rays
                </button>

                <button
                  type="button"
                  onClick={() => scrollToSection('feedback')}
                  className={`rad-nav-link border-0 bg-transparent cursor-pointer ${location.pathname === '/workspace' && activeSection === 'feedback' ? 'active' : ''}`}
                >
                  <i className="fas fa-comment-medical"></i> Feedback
                </button>

                <Link
                  to="/profile"
                  className={`rad-nav-link ${location.pathname === '/profile' ? 'active' : ''}`}
                >
                  <i className="fas fa-user-md"></i> Profile
                </Link>

                {user.role === 'admin' && (
                  <Link
                    className={`rad-nav-link text-warning ${location.pathname.startsWith('/admin') ? 'active' : ''}`}
                    to="/admin/hub"
                  >
                    <i className="fas fa-shield-alt"></i> Admin Hub
                  </Link>
                )}
              </nav>

              <div className="vr d-none d-lg-block mx-2 opacity-25" style={{ height: '24px', backgroundColor: 'var(--rad-border)' }}></div>

              {/* Instant Theme Toggle Button */}
              <button
                onClick={toggleTheme}
                className="glass-btn small"
                title={isLight ? 'Switch to dark theme' : 'Switch to light theme'}
                style={{ padding: '6px 10px', fontSize: '0.85rem' }}
              >
                <span>{isLight ? '☀' : '☾'}</span>
                <span className="d-none d-sm-inline ms-1">{isLight ? 'Light' : 'Dark'}</span>
              </button>

              {/* Clinician Pill (Hidden on narrowest mobile, visible >= sm) */}
              <div className="d-none d-sm-inline-flex align-items-center gap-2 px-2.5 py-1 rounded-pill glass-card" style={{ border: '1px solid var(--rad-border)' }}>
                {user.profilePhoto ? (
                  <img
                    src={user.profilePhoto}
                    alt={user.name}
                    className="rounded-circle"
                    style={{ width: '22px', height: '22px', objectFit: 'cover', border: '1px solid var(--rad-cyan, #39ff14)' }}
                  />
                ) : (
                  <span className="pulse-dot" style={{ backgroundColor: 'var(--rad-cyan, #39ff14)' }}></span>
                )}
                <span className="fw-bold text-white small text-truncate" style={{ maxWidth: '100px' }}>{user.name}</span>
                <span className="badge extra-small text-uppercase d-none d-md-inline" style={{ background: 'rgba(57, 255, 20, 0.15)', color: 'var(--rad-cyan, #39ff14)' }}>
                  {user.role}
                </span>
              </div>

              {/* Desktop Logout Button */}
              <button onClick={handleLogout} className="glass-btn small d-none d-lg-inline-flex" title="Log Out">
                <i className="fas fa-power-off text-danger"></i>
              </button>

              {/* Mobile Hamburger Toggle Button */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className={`glass-btn small d-lg-none ${mobileMenuOpen ? 'active primary' : ''}`}
                style={{ padding: '6px 12px', fontSize: '1rem' }}
                aria-label="Toggle navigation menu"
              >
                <i className={`fas ${mobileMenuOpen ? 'fa-times' : 'fa-bars'}`}></i>
              </button>
            </div>
          ) : (
            <div className="d-flex align-items-center gap-2">
              <Link to="/login" className="glass-btn small">Sign In</Link>
              <Link to="/register" className="glass-btn primary small">Onboard Clinician</Link>
            </div>
          )}
        </div>
      </header>

      {/* Mobile Navigation Drawer & Backdrop */}
      {user && mobileMenuOpen && (
        <>
          <div
            className="rad-mobile-backdrop d-lg-none"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="rad-mobile-drawer d-lg-none">
            {/* Clinician Profile Card */}
            <div className="p-3 mb-3 rounded-3 glass-card d-flex align-items-center justify-content-between" style={{ border: '1px solid var(--rad-border)' }}>
              <div className="d-flex align-items-center gap-2.5">
                {user.profilePhoto ? (
                  <img
                    src={user.profilePhoto}
                    alt={user.name}
                    className="rounded-circle"
                    style={{ width: '36px', height: '36px', objectFit: 'cover', border: '2px solid var(--rad-cyan, #39ff14)' }}
                  />
                ) : (
                  <div className="rounded-circle bg-dark d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', border: '1px solid var(--rad-border)' }}>
                    <i className="fas fa-user-md" style={{ color: 'var(--rad-cyan, #39ff14)' }}></i>
                  </div>
                )}
                <div>
                  <div className="fw-bold text-white small">{user.name}</div>
                  <div className="text-secondary extra-small font-monospace">{user.email || 'Clinician'}</div>
                </div>
              </div>
              <span className="badge text-uppercase" style={{ background: 'rgba(57, 255, 20, 0.15)', color: 'var(--rad-cyan, #39ff14)' }}>
                {user.role}
              </span>
            </div>

            {/* Mobile Nav Links */}
            <nav className="d-flex flex-column gap-2 mb-3">
              <button
                type="button"
                onClick={() => scrollToSection('workstation')}
                className={`rad-mobile-nav-item ${location.pathname === '/workspace' && activeSection === 'workstation' ? 'active' : ''}`}
              >
                <i className="fas fa-desktop me-2.5 text-cyan" style={{ color: 'var(--rad-cyan)' }}></i>
                <span>Workstation</span>
              </button>

              <button
                type="button"
                onClick={() => scrollToSection('analytics')}
                className={`rad-mobile-nav-item ${location.pathname === '/workspace' && activeSection === 'analytics' ? 'active' : ''}`}
              >
                <i className="fas fa-chart-line me-2.5 text-cyan" style={{ color: 'var(--rad-cyan)' }}></i>
                <span>Analytics</span>
              </button>

              <button
                type="button"
                onClick={() => scrollToSection('studies')}
                className={`rad-mobile-nav-item ${location.pathname === '/workspace' && activeSection === 'studies' ? 'active' : ''}`}
              >
                <i className="fas fa-list-alt me-2.5 text-cyan" style={{ color: 'var(--rad-cyan)' }}></i>
                <span>Chest X-Rays</span>
              </button>

              <button
                type="button"
                onClick={() => scrollToSection('feedback')}
                className={`rad-mobile-nav-item ${location.pathname === '/workspace' && activeSection === 'feedback' ? 'active' : ''}`}
              >
                <i className="fas fa-comment-medical me-2.5 text-cyan" style={{ color: 'var(--rad-cyan)' }}></i>
                <span>Feedback</span>
              </button>

              <Link
                to="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className={`rad-mobile-nav-item ${location.pathname === '/profile' ? 'active' : ''}`}
              >
                <i className="fas fa-user-md me-2.5 text-cyan" style={{ color: 'var(--rad-cyan)' }}></i>
                <span>Clinician Profile</span>
              </Link>

              {user.role === 'admin' && (
                <Link
                  to="/admin/hub"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`rad-mobile-nav-item text-warning ${location.pathname.startsWith('/admin') ? 'active' : ''}`}
                >
                  <i className="fas fa-shield-alt me-2.5"></i>
                  <span>Admin Hub</span>
                </Link>
              )}
            </nav>

            {/* Mobile Actions: Theme + Logout */}
            <div className="pt-2 border-top border-secondary border-opacity-25 d-flex gap-2">
              <button
                onClick={toggleTheme}
                className="glass-btn flex-fill justify-content-center py-2"
              >
                <span>{isLight ? '☀ Light Mode' : '☾ Dark Mode'}</span>
              </button>
              <button
                onClick={handleLogout}
                className="glass-btn flex-fill justify-content-center py-2 text-danger"
              >
                <i className="fas fa-power-off me-1.5"></i> Log Out
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default RadiologyNavbar;
