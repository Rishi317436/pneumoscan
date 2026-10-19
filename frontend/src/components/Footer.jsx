import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="py-4 mt-auto">
      <div className="container">
        <div className="row align-items-center gy-3">
          <div className="col-md-6 text-center text-md-start">
            <div className="d-flex align-items-center justify-content-center justify-content-md-start gap-2 mb-1">
              <i className="fas fa-lungs text-teal" style={{ color: '#14b8a6' }}></i>
              <span className="fw-bold text-white small">PneumoScan Diagnostic Platform</span>
              <span className="badge bg-dark border border-secondary text-light ms-1 small">v1.0.0</span>
            </div>
            <p className="text-light opacity-75 mb-0 extra-small" style={{ fontSize: '0.8rem' }}>
              Chest X-Ray Analysis powered by Digital Image Processing & Deep Learning Neural Networks.
            </p>
          </div>
          <div className="col-md-6 text-center text-md-end">
            <div className="d-flex align-items-center justify-content-center justify-content-md-end gap-2 gap-sm-3 mb-2 flex-wrap">
              <span className="d-inline-flex align-items-center gap-1.5 extra-small text-light opacity-85" style={{ fontSize: '0.825rem' }}>
                <span className="pulse-dot"></span> System Engine: Active
              </span>
              <Link to="/upload" className="footer-link text-light opacity-75">Upload Scan</Link>
              <Link to="/worklist" className="footer-link text-light opacity-75">Chest X-Rays</Link>
              <Link to="/comparison" className="footer-link text-light opacity-75">Comparison</Link>
              <Link to="/feedback" className="footer-link text-light opacity-75">Feedback</Link>
            </div>
            <p className="text-light opacity-75 mb-0 extra-small" style={{ fontSize: '0.775rem' }}>
              &copy; {new Date().getFullYear()} PneumoScan Diagnostics. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
