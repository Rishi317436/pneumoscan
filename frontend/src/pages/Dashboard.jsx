import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const { user } = useAuth();

  return (
    <div className="container py-4">
      {/* Hero Section */}
      <div className="card border-0 rounded-4 overflow-hidden shadow-sm mb-4">
        <div className="bg-teal-gradient p-5 text-white position-relative">
          <div className="row align-items-center position-relative z-1">
            <div className="col-lg-8">
              <span className="badge bg-white text-teal rounded-pill px-3 py-2 fw-medium mb-3 shadow-sm d-inline-block">
                Diagnostic Chest X-Ray Analysis
              </span>
              <h1 className="display-5 fw-bold mb-3">Welcome back, {user?.name}! 👋</h1>
              <p className="lead mb-4 opacity-90">
                Automated Pneumonia Detection & Multi-Method Comparison System powered by Digital Image Processing and Deep Learning.
              </p>
              <Link to="/upload" className="btn btn-light btn-lg rounded-pill px-4 shadow text-teal fw-bold">
                <i className="fas fa-microscope me-2"></i> Start New Analysis
              </Link>
            </div>
            <div className="col-lg-4 text-center d-none d-lg-block">
              <i className="fas fa-lungs fa-8x opacity-25 float-anim"></i>
            </div>
          </div>
        </div>
      </div>

      {/* Stats / Quick Action Cards */}
      <div className="row g-4 mb-4">
        <div className="col-md-4">
          <Link to="/upload" className="text-decoration-none">
            <div className="card border-0 rounded-4 shadow-sm h-100 card-hover bg-glass">
              <div className="card-body p-4 text-center">
                <div className="icon-circle bg-teal-subtle text-teal mx-auto mb-3">
                  <i className="fas fa-upload fs-3"></i>
                </div>
                <h4 className="fw-bold text-dark mb-1">Upload Scan</h4>
                <p className="text-muted mb-0">Upload Chest X-Ray for analysis</p>
              </div>
            </div>
          </Link>
        </div>
        <div className="col-md-4">
          <Link to="/results" className="text-decoration-none">
            <div className="card border-0 rounded-4 shadow-sm h-100 card-hover bg-glass">
              <div className="card-body p-4 text-center">
                <div className="icon-circle bg-primary-subtle text-primary mx-auto mb-3">
                  <i className="fas fa-chart-line fs-3"></i>
                </div>
                <h4 className="fw-bold text-dark mb-1">Detection Results</h4>
                <p className="text-muted mb-0">View past predictions & history</p>
              </div>
            </div>
          </Link>
        </div>
        <div className="col-md-4">
          <Link to="/comparison" className="text-decoration-none">
            <div className="card border-0 rounded-4 shadow-sm h-100 card-hover bg-glass">
              <div className="card-body p-4 text-center">
                <div className="icon-circle bg-warning-subtle text-warning mx-auto mb-3">
                  <i className="fas fa-balance-scale fs-3"></i>
                </div>
                <h4 className="fw-bold text-dark mb-1">Method Comparison</h4>
                <p className="text-muted mb-0">Compare manual vs DL approaches</p>
              </div>
            </div>
          </Link>
        </div>
      </div>

      <div className="row g-4">
        {/* Platform Capabilities */}
        <div className="col-lg-6">
          <div className="card border-0 rounded-4 shadow-sm h-100 bg-glass">
            <div className="card-body p-4">
              <div className="d-flex align-items-center mb-4">
                <i className="fas fa-lungs text-teal fs-3 me-3"></i>
                <h4 className="card-title fw-bold mb-0">Platform Capabilities</h4>
              </div>
              <p className="text-muted">
                This platform utilizes a dual-method system for highly accurate pneumonia detection from chest X-ray images.
              </p>

              <div className="d-flex mb-3 align-items-start">
                <div className="bg-light rounded p-2 me-3 text-secondary">
                  <i className="fas fa-cogs fs-5"></i>
                </div>
                <div>
                  <h6 className="fw-bold mb-1">Traditional Image Processing</h6>
                  <p className="small text-muted mb-0">
                    Uses OpenCV feature extraction (GLCM, LBP, intensity, edges) with calibrated threshold logic.
                  </p>
                </div>
              </div>

              <div className="d-flex align-items-start">
                <div className="bg-light rounded p-2 me-3 text-secondary">
                  <i className="fas fa-robot fs-5"></i>
                </div>
                <div>
                  <h6 className="fw-bold mb-1">Machine Learning / DL</h6>
                  <p className="small text-muted mb-0">
                    Employs a trained DenseNet121 architecture to classify scans with high confidence and Grad-CAM explainability.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Workflow Steps */}
        <div className="col-lg-6">
          <div className="card border-0 rounded-4 shadow-sm h-100 bg-glass">
            <div className="card-body p-4">
              <div className="d-flex align-items-center mb-4">
                <i className="fas fa-project-diagram text-primary fs-3 me-3"></i>
                <h4 className="card-title fw-bold mb-0">Workflow Steps</h4>
              </div>

              <div className="position-relative ms-2">
                <div className="d-flex mb-3 align-items-start">
                  <div
                    className="bg-teal text-white rounded-circle d-flex align-items-center justify-content-center me-3 z-1"
                    style={{ width: '32px', height: '32px', flexShrink: 0, backgroundColor: '#0d9488' }}
                  >
                    1
                  </div>
                  <div>
                    <h6 className="fw-bold mb-1 mt-1">Upload Chest X-Ray</h6>
                    <p className="small text-muted mb-0">
                      Securely upload an anterior-posterior (AP) or posterior-anterior (PA) Chest X-Ray.
                    </p>
                  </div>
                </div>

                <div className="d-flex mb-3 align-items-start">
                  <div
                    className="bg-teal text-white rounded-circle d-flex align-items-center justify-content-center me-3 z-1"
                    style={{ width: '32px', height: '32px', flexShrink: 0, backgroundColor: '#0d9488' }}
                  >
                    2
                  </div>
                  <div>
                    <h6 className="fw-bold mb-1 mt-1">Traditional Method Analysis</h6>
                    <p className="small text-muted mb-0">
                      Extracts handcrafted features using traditional digital image processing.
                    </p>
                  </div>
                </div>

                <div className="d-flex mb-3 align-items-start">
                  <div
                    className="bg-teal text-white rounded-circle d-flex align-items-center justify-content-center me-3 z-1"
                    style={{ width: '32px', height: '32px', flexShrink: 0, backgroundColor: '#0d9488' }}
                  >
                    3
                  </div>
                  <div>
                    <h6 className="fw-bold mb-1 mt-1">Machine Learning Classification</h6>
                    <p className="small text-muted mb-0">
                      Processes image through DenseNet121 and generates Grad-CAM visualizations.
                    </p>
                  </div>
                </div>

                <div className="d-flex align-items-start">
                  <div
                    className="bg-teal text-white rounded-circle d-flex align-items-center justify-content-center me-3 z-1"
                    style={{ width: '32px', height: '32px', flexShrink: 0, backgroundColor: '#0d9488' }}
                  >
                    4
                  </div>
                  <div>
                    <h6 className="fw-bold mb-1 mt-1">Compare Methods & Review</h6>
                    <p className="small text-muted mb-0">
                      View comprehensive agreement analysis and side-by-side performance metrics.
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

export default Dashboard;
