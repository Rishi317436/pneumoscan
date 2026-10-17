import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI } from '../services/api';

const AdminTraining = () => {
  const [statusInfo, setStatusInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchTrainingStatus();
  }, []);

  const fetchTrainingStatus = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getTrainingStatus();
      if (res.data.success) {
        setStatusInfo(res.data.statusInfo);
      } else {
        setErrorMsg(res.data.message || 'Failed to fetch model training status.');
      }
    } catch (err) {
      console.error('Training status error:', err);
      setErrorMsg('Failed to load training status.');
    } finally {
      setLoading(false);
    }
  };

  const manualMetrics = statusInfo?.manualMetrics;
  const mlMetrics = statusInfo?.mlMetrics;

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1">
            <Link to="/admin" className="btn btn-outline-secondary btn-sm py-0.5 px-2">
              <i className="fas fa-arrow-left me-1"></i>Admin
            </Link>
            <h2 className="fw-extrabold text-dark mb-0 d-flex align-items-center gap-2">
              <i className="fas fa-cogs text-teal" style={{ color: '#14b8a6' }}></i>
              <span>Neural & DIP Model Training Hub</span>
            </h2>
          </div>
          <p className="text-muted small mb-0">
            Monitor dataset status, calibrate traditional feature thresholds, and verify deep learning weights.
          </p>
        </div>
        <div>
          <Link to="/comparison" className="btn btn-outline-primary btn-sm d-inline-flex align-items-center gap-1.5">
            <i className="fas fa-balance-scale"></i> View Comparison Benchmark
          </Link>
        </div>
      </div>

      {errorMsg && (
        <div className="alert alert-danger alert-dismissible fade show shadow-sm border-0 mb-4">
          <i className="fas fa-exclamation-triangle me-2"></i>
          {errorMsg}
          <button type="button" className="btn-close" onClick={() => setErrorMsg('')}></button>
        </div>
      )}

      {loading ? (
        <div className="d-flex justify-content-center py-5">
          <div className="spinner-border text-teal" role="status">
            <span className="visually-hidden">Loading model status...</span>
          </div>
        </div>
      ) : (
        <>
          <div className="row g-4 mb-4">
            {/* Dataset Info Card */}
            <div className="col-md-6">
              <div className="card h-100 shadow-sm border-0">
                <div className="card-header py-3 bg-dark text-white d-flex align-items-center justify-content-between">
                  <h6 className="mb-0 fw-bold">
                    <i className="fas fa-database me-2 text-teal" style={{ color: '#14b8a6' }}></i>
                    Chest X-Ray Dataset
                  </h6>
                  {statusInfo?.datasetExists ? (
                    <span className="badge bg-success">
                      <i className="fas fa-check-circle me-1"></i> Mounted
                    </span>
                  ) : (
                    <span className="badge bg-warning text-dark">
                      <i className="fas fa-exclamation-triangle me-1"></i> Local Path Configured
                    </span>
                  )}
                </div>
                <div className="card-body p-4">
                  <p className="text-secondary small mb-3">
                    The system utilizes the Kaggle Chest X-Ray Images (Pneumonia) dataset partitioned into <code>train/</code>, <code>val/</code>, and <code>test/</code> directories containing <strong>NORMAL</strong> and <strong>PNEUMONIA</strong> subsets.
                  </p>

                  <div className="p-3 bg-light border rounded-3 mb-3 extra-small">
                    <div className="d-flex justify-content-between mb-1.5">
                      <span className="text-secondary fw-bold">Configured Path:</span>
                      <span className="font-monospace text-dark">{statusInfo?.datasetPath || './dataset/chest_xray'}</span>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span className="text-secondary fw-bold">Status:</span>
                      <span className={statusInfo?.datasetExists ? 'text-success fw-bold' : 'text-muted'}>
                        {statusInfo?.datasetExists ? 'Ready for Training & Benchmarking' : 'Dataset mounted in dataset/chest_xray'}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-dark text-white rounded-3 extra-small font-monospace">
                    <div className="text-muted mb-1"># CLI to train neural model:</div>
                    <div className="text-teal" style={{ color: '#5eead4' }}>python dip_engine/train_binary_model.py</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Traditional Thresholds Card */}
            <div className="col-md-6">
              <div className="card h-100 shadow-sm border-0">
                <div className="card-header py-3 bg-dark text-white d-flex align-items-center justify-content-between">
                  <h6 className="mb-0 fw-bold">
                    <i className="fas fa-sliders-h me-2 text-teal" style={{ color: '#14b8a6' }}></i>
                    Traditional DIP Thresholds
                  </h6>
                  {statusInfo?.thresholdsExists ? (
                    <span className="badge bg-success">
                      <i className="fas fa-check me-1"></i> Calibrated
                    </span>
                  ) : (
                    <span className="badge bg-danger">
                      <i className="fas fa-times me-1"></i> Not Calibrated
                    </span>
                  )}
                </div>
                <div className="card-body p-4">
                  <p className="text-secondary small mb-3">
                    Statistical feature extraction (Mean, Entropy, LBP, GLCM, Edge Density) uses thresholds derived from the training set distribution to compute rule-based risk scores.
                  </p>

                  <div className="p-3 bg-light border rounded-3 mb-3 extra-small">
                    <div className="d-flex justify-content-between mb-1.5">
                      <span className="text-secondary fw-bold">Threshold File:</span>
                      <span className="font-monospace">dip_engine/models/manual_thresholds.json</span>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span className="text-secondary fw-bold">Evaluation Accuracy:</span>
                      <span className="fw-bold text-dark">
                        {manualMetrics && typeof manualMetrics.accuracy === 'number'
                          ? `${(manualMetrics.accuracy * 100).toFixed(1)}%`
                          : 'Run calibration script'}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-dark text-white rounded-3 extra-small font-monospace">
                    <div className="text-muted mb-1"># CLI to calibrate traditional thresholds:</div>
                    <div className="text-teal" style={{ color: '#5eead4' }}>python dip_engine/manual_training.py</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Deep Learning Model Status Card */}
          <div className="row g-4 mb-4">
            <div className="col-md-12">
              <div className="card shadow-sm border-0">
                <div className="card-header py-3 bg-dark text-white d-flex align-items-center justify-content-between">
                  <h6 className="mb-0 fw-bold">
                    <i className="fas fa-network-wired me-2 text-teal" style={{ color: '#14b8a6' }}></i>
                    Deep Learning Neural Network (DenseNet-121)
                  </h6>
                  {statusInfo?.modelExists ? (
                    <span className="badge bg-success">
                      <i className="fas fa-check-circle me-1"></i> Trained Weights Active
                    </span>
                  ) : (
                    <span className="badge bg-warning text-dark">
                      <i className="fas fa-hourglass-half me-1"></i> Ready for Training
                    </span>
                  )}
                </div>
                <div className="card-body p-4">
                  <div className="row g-4">
                    <div className="col-md-6">
                      <h6 className="fw-bold text-dark small mb-2">Model Specifications & Hyperparameters</h6>
                      <ul className="list-unstyled extra-small text-secondary d-flex flex-column gap-2 mb-0">
                        <li><strong>Backbone:</strong> DenseNet-121 pre-trained on ImageNet</li>
                        <li><strong>Classification Head:</strong> GlobalAveragePooling2D + Dense(256, ReLU) + Dropout(0.5) + Sigmoid</li>
                        <li><strong>Loss Function:</strong> Binary Cross-Entropy with Class Weighting for Imbalance</li>
                        <li><strong>Optimization:</strong> Adam with ReduceLROnPlateau & EarlyStopping</li>
                        <li><strong>Model Artifact:</strong> <code>dip_engine/models/pneumonia_binary_model.keras</code></li>
                      </ul>
                    </div>
                    <div className="col-md-6">
                      <h6 className="fw-bold text-dark small mb-2">Validation / Test Performance Metrics</h6>
                      {mlMetrics ? (
                        <div className="row g-2 text-center">
                          <div className="col-4">
                            <div className="p-2 border rounded bg-light">
                              <span className="text-muted extra-small d-block">Accuracy</span>
                              <strong className="text-teal">{(mlMetrics.accuracy * 100).toFixed(1)}%</strong>
                            </div>
                          </div>
                          <div className="col-4">
                            <div className="p-2 border rounded bg-light">
                              <span className="text-muted extra-small d-block">Precision</span>
                              <strong className="text-teal">{(mlMetrics.precision * 100).toFixed(1)}%</strong>
                            </div>
                          </div>
                          <div className="col-4">
                            <div className="p-2 border rounded bg-light">
                              <span className="text-muted extra-small d-block">Recall</span>
                              <strong className="text-teal">{(mlMetrics.recall * 100).toFixed(1)}%</strong>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 border rounded bg-light text-muted extra-small">
                          Metrics will populate automatically once <code>evaluate_model.py</code> or <code>train_binary_model.py</code> completes execution.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminTraining;
