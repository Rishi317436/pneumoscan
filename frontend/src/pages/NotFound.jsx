import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div className="container py-5">
      <div className="row justify-content-center py-5">
        <div className="col-md-6 text-center">
          <div
            className="stat-icon-wrapper bg-danger-subtle text-danger mx-auto mb-3"
            style={{ width: '80px', height: '80px', fontSize: '2.5rem' }}
          >
            <i className="fas fa-exclamation-triangle"></i>
          </div>
          <h1 className="display-4 fw-extrabold text-dark mb-2">404</h1>
          <h4 className="fw-bold text-secondary mb-3">Page Not Found</h4>
          <p className="text-muted mb-4">The requested page or diagnostic resource could not be found.</p>
          <Link to="/dashboard" className="btn btn-primary px-4 py-2">
            Return to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
