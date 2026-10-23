import React from 'react';

const AIConfidenceGauge = ({ mlDetection, manualDetection }) => {
  const isPneumonia = mlDetection?.prediction === 'PNEUMONIA';
  const rawConfidence = typeof mlDetection?.confidence === 'number' ? mlDetection.confidence : 0;
  const confidencePercent = rawConfidence <= 1 ? rawConfidence * 100 : rawConfidence;

  return (
    <div className={`rad-card p-4 ${isPneumonia ? 'rad-card-glow-rose' : 'rad-card-glow-emerald'}`}>
      <div className="d-flex align-items-center justify-content-between mb-2">
        <span className="text-secondary extra-small fw-bold text-uppercase" style={{ letterSpacing: '0.05em' }}>
          Diagnostic Call
        </span>
        <span className="badge bg-dark border border-secondary text-cyan extra-small font-monospace">
          DenseNet-121
        </span>
      </div>

      {/* Main Classification & Confidence Score */}
      <div className="d-flex flex-column flex-sm-row align-items-start align-items-sm-center justify-content-between my-3 gap-2">
        <div>
          {isPneumonia ? (
            <span className="badge rad-badge-pneumonia fs-6 px-3 py-2 text-wrap text-start lh-base">
              <i className="fas fa-exclamation-triangle me-2"></i> Pneumonia Detected
            </span>
          ) : (
            <span className="badge rad-badge-normal fs-6 px-3 py-2">
              <i className="fas fa-shield-alt me-2"></i> Normal
            </span>
          )}
        </div>

        {/* Confidence Score */}
        <div className="text-end">
          <span className="text-secondary extra-small d-block fw-bold text-uppercase">Confidence Score</span>
          <h2
            className="fw-extrabold mb-0"
            style={{
              fontFamily: 'var(--rad-mono)',
              color: isPneumonia ? 'var(--rad-rose)' : 'var(--rad-emerald)'
            }}
          >
            {confidencePercent.toFixed(1)}%
          </h2>
        </div>
      </div>

      {/* Confidence Bar */}
      <div className="progress bg-dark border border-secondary border-opacity-25 my-3" style={{ height: '8px', borderRadius: '4px' }}>
        <div
          className={`progress-bar ${isPneumonia ? 'bg-danger' : 'bg-success'}`}
          role="progressbar"
          style={{
            width: `${Math.min(confidencePercent, 100)}%`,
            boxShadow: isPneumonia ? '0 0 10px rgba(244, 63, 94, 0.5)' : '0 0 10px rgba(16, 185, 129, 0.5)'
          }}
        ></div>
      </div>

      {/* Dual Method Summary */}
      <div className="p-2.5 rounded-3 bg-dark border border-secondary border-opacity-25 mt-3">
        <div className="row g-2 text-center align-items-center">
          <div className="col-4">
            <small className="text-muted extra-small d-block">Manual DIP</small>
            <strong className={`small ${manualDetection?.prediction === 'PNEUMONIA' ? 'text-danger' : 'text-success'}`}>
              {manualDetection?.prediction === 'PNEUMONIA' ? 'Pneumonia Detected' : (manualDetection?.prediction === 'NORMAL' ? 'Normal' : manualDetection?.prediction || 'N/A')}
            </strong>
          </div>
          <div className="col-4 border-start border-end border-secondary border-opacity-25">
            <small className="text-muted extra-small d-block">Deep Learning</small>
            <strong className={`small ${mlDetection?.prediction === 'PNEUMONIA' ? 'text-danger' : 'text-success'}`}>
              {mlDetection?.prediction === 'PNEUMONIA' ? 'Pneumonia Detected' : (mlDetection?.prediction === 'NORMAL' ? 'Normal' : mlDetection?.prediction || 'N/A')}
            </strong>
          </div>
          <div className="col-4">
            <small className="text-muted extra-small d-block">Concordance</small>
            <strong className="text-success small">
              AGREE
            </strong>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIConfidenceGauge;
