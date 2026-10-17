import React, { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';
import MetricCard from '../components/common/MetricCard';

const AdminTrainingHub = () => {
  const [statusInfo, setStatusInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getTrainingStatus();
      if (res.data.success) {
        setStatusInfo(res.data.statusInfo);
      }
    } catch (err) {
      console.error('Fetch training status error:', err);
    } finally {
      setLoading(false);
    }
  };

  const manualMetrics = statusInfo?.manualMetrics;
  const mlMetrics = statusInfo?.mlMetrics;

  return (
    <div className="container-fluid py-4 px-lg-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-extrabold text-white mb-1 d-flex align-items-center gap-2">
            <i className="fas fa-microchip text-cyan" style={{ color: 'var(--rad-cyan)' }}></i>
            <span>Neural Training & Calibration Hub</span>
          </h2>
          <p className="text-secondary small mb-0">
            Monitor model artifact states, dataset integrity, and convolutional neural weights.
          </p>
        </div>
      </div>

      <div className="row g-4 mb-4">
        {/* Dataset Card */}
        <div className="col-md-6">
          <div className="rad-card p-4 h-100">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="fw-bold text-white small text-uppercase mb-0">
                <i className="fas fa-database me-2 text-cyan" style={{ color: 'var(--rad-cyan)' }}></i>
                Chest X-Ray Dataset Mount
              </h6>
              {statusInfo?.datasetExists ? (
                <span className="badge rad-badge-normal">MOUNTED</span>
              ) : (
                <span className="badge rad-badge-disagree">LOCAL CONFIG</span>
              )}
            </div>

            <p className="text-secondary extra-small mb-3">
              Kaggle Chest X-Ray (Pneumonia) dataset partitioned into <code>train/</code>, <code>val/</code>, and <code>test/</code> partitions.
            </p>

            <div className="p-3 rounded bg-dark border border-secondary border-opacity-25 extra-small font-monospace text-secondary mb-3">
              <div className="d-flex justify-content-between mb-1">
                <span>Configured Path:</span>
                <span className="text-white">{statusInfo?.datasetPath || './dataset/chest_xray'}</span>
              </div>
              <div className="d-flex justify-content-between">
                <span>Dataset State:</span>
                <span className={statusInfo?.datasetExists ? 'text-success' : 'text-warning'}>
                  {statusInfo?.datasetExists ? 'Active & Validated' : 'Verify Path'}
                </span>
              </div>
            </div>

            <div className="p-2.5 rounded bg-dark text-cyan font-monospace extra-small">
              # Train binary CNN: python dip_engine/train_binary_model.py
            </div>
          </div>
        </div>

        {/* Traditional DIP Calibrator */}
        <div className="col-md-6">
          <div className="rad-card p-4 h-100">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="fw-bold text-white small text-uppercase mb-0">
                <i className="fas fa-sliders-h me-2 text-cyan" style={{ color: 'var(--rad-cyan)' }}></i>
                Traditional DIP Calibrated Thresholds
              </h6>
              {statusInfo?.thresholdsExists ? (
                <span className="badge rad-badge-normal">CALIBRATED</span>
              ) : (
                <span className="badge rad-badge-pneumonia">NOT CALIBRATED</span>
              )}
            </div>

            <p className="text-secondary extra-small mb-3">
              GLCM texture matrices, Local Binary Patterns, and intensity histograms calibrated against the training cohort.
            </p>

            <div className="p-3 rounded bg-dark border border-secondary border-opacity-25 extra-small font-monospace text-secondary mb-3">
              <div className="d-flex justify-content-between mb-1">
                <span>Threshold File:</span>
                <span className="text-white">dip_engine/models/manual_thresholds.json</span>
              </div>
              <div className="d-flex justify-content-between">
                <span>DIP Accuracy:</span>
                <span className="text-white">
                  {manualMetrics && typeof manualMetrics.accuracy === 'number'
                    ? `${(manualMetrics.accuracy * 100).toFixed(1)}%`
                    : 'Execute Calibration'}
                </span>
              </div>
            </div>

            <div className="p-2.5 rounded bg-dark text-cyan font-monospace extra-small">
              # Calibrate features: python dip_engine/manual_training.py
            </div>
          </div>
        </div>
      </div>

      {/* DenseNet-121 Neural Network Details */}
      <div className="rad-card p-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h6 className="fw-bold text-white small text-uppercase mb-0">
            <i className="fas fa-network-wired me-2 text-cyan" style={{ color: 'var(--rad-cyan)' }}></i>
            DenseNet-121 Deep Transfer Learning Weights
          </h6>
          {statusInfo?.modelExists ? (
            <span className="badge rad-badge-normal">ACTIVE WEIGHTS</span>
          ) : (
            <span className="badge rad-badge-pneumonia">MODEL NOT FOUND</span>
          )}
        </div>

        <div className="row g-4">
          <div className="col-md-6">
            <ul className="list-unstyled extra-small text-secondary mb-0 d-flex flex-column gap-1.5 font-monospace">
              <li><strong>Backbone:</strong> DenseNet-121 pre-trained on ImageNet</li>
              <li><strong>Head:</strong> GlobalAveragePooling2D + Dense(256, ReLU) + Dropout(0.5) + Sigmoid</li>
              <li><strong>Input Tensor:</strong> (224, 224, 3) Normalized</li>
              <li><strong>Artifact:</strong> dip_engine/models/pneumonia_binary_model.keras</li>
            </ul>
          </div>
          <div className="col-md-6">
            {mlMetrics ? (
              <div className="row g-2 text-center">
                <div className="col-4">
                  <div className="p-2 rounded bg-dark border border-secondary border-opacity-25">
                    <small className="text-muted extra-small d-block">Accuracy</small>
                    <strong className="text-cyan font-monospace">{(mlMetrics.accuracy * 100).toFixed(1)}%</strong>
                  </div>
                </div>
                <div className="col-4">
                  <div className="p-2 rounded bg-dark border border-secondary border-opacity-25">
                    <small className="text-muted extra-small d-block">Precision</small>
                    <strong className="text-cyan font-monospace">{(mlMetrics.precision * 100).toFixed(1)}%</strong>
                  </div>
                </div>
                <div className="col-4">
                  <div className="p-2 rounded bg-dark border border-secondary border-opacity-25">
                    <small className="text-muted extra-small d-block">Recall</small>
                    <strong className="text-cyan font-monospace">{(mlMetrics.recall * 100).toFixed(1)}%</strong>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-secondary small mb-0">Metrics available upon benchmark evaluation.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminTrainingHub;
