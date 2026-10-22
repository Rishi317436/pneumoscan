import React from 'react';
import { isDIPAdjudicated } from '../../utils/adjudication';

const DualMethodComparisonCard = ({ manualDetection, mlDetection, comparison }) => {
  const manual = manualDetection || {};
  const ml = mlDetection || {};
  const comp = comparison || {};
  const zones = manual.zones || {};
  const isAdjudicated = isDIPAdjudicated(manual, ml, comp);

  const isNormal = (manual.prediction || '').toUpperCase() === 'NORMAL';
  const rawScore = typeof manual.confidence === 'number'
    ? manual.confidence
    : (typeof manual.score === 'number' ? manual.score : 0);
  const manualConfidence = isNormal && rawScore < 50 ? (100 - rawScore) : (rawScore > 1 ? rawScore : rawScore * 100);
  const mlConf = typeof ml.confidence === 'number' ? (ml.confidence <= 1 ? ml.confidence * 100 : ml.confidence) : 0;

  const zoneKeys = [
    { key: 'right_upper', short: 'RUL', name: 'Right Upper Zone' },
    { key: 'left_upper', short: 'LUL', name: 'Left Upper Zone' },
    { key: 'right_middle', short: 'RML', name: 'Right Middle Zone' },
    { key: 'left_middle', short: 'LML', name: 'Left Middle Zone' },
    { key: 'right_lower', short: 'RLL', name: 'Right Lower Zone' },
    { key: 'left_lower', short: 'LLL', name: 'Left Lower Zone' },
  ];

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ABNORMAL':
        return <span className="badge bg-danger text-white extra-small">ABNORMAL</span>;
      case 'SUSPICIOUS':
        return <span className="badge bg-warning text-dark extra-small">SUSPICIOUS</span>;
      default:
        return <span className="badge bg-success text-white extra-small">NORMAL</span>;
    }
  };

  return (
    <div className="rad-card p-4">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div className="d-flex align-items-center gap-2">
          <i className="fas fa-balance-scale" style={{ color: 'var(--rad-cyan)' }}></i>
          <h5 className="fw-bold text-white mb-0">Dual-Engine Comparative Concordance</h5>
        </div>
        <span className="badge bg-dark border border-secondary text-cyan extra-small">
          Manual DIP &bull; DenseNet-121
        </span>
      </div>

      <div className="row g-3">
        {/* Method 1: Manual DIP */}
        <div className="col-lg-6">
          <div className="p-3 rounded-3 bg-dark border border-secondary border-opacity-25 h-100 d-flex flex-column">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="fw-bold text-white small d-flex align-items-center gap-2">
                <i className="fas fa-lungs text-cyan" style={{ color: 'var(--rad-cyan)' }}></i>
                <span>Method 1: Manual DIP Engine</span>
              </span>
              <span className="badge bg-secondary-subtle text-secondary extra-small">13-Stage DIP</span>
            </div>

            {/* Classification & Confidence Score */}
            {isAdjudicated && (
              <div className="p-2 mb-2 rounded bg-warning-subtle text-warning border border-warning border-opacity-25 extra-small">
                <i className="fas fa-info-circle me-1"></i>
                <strong>Notice:</strong> Manual DIP failed to identify; the ML model is correct, so the final answer is determined from the ML model.
              </div>
            )}
            <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 my-2 p-2.5 rounded bg-surface">
              <div>
                <small className="text-muted extra-small d-block text-uppercase fw-bold">Prediction</small>
                {manual.prediction === 'PNEUMONIA' ? (
                  <span className="badge rad-badge-pneumonia fs-6 px-2.5 py-1 text-wrap text-start">
                    Pneumonia Suspected — Further Clinical Evaluation Required
                  </span>
                ) : (
                  <span className="badge rad-badge-normal fs-6 px-2.5 py-1">
                    Normal
                  </span>
                )}
              </div>
              {!isAdjudicated && (
                <div className="text-end">
                  <small className="text-muted extra-small d-block text-uppercase fw-bold">Confidence Score</small>
                  <span className="fw-bold fs-5 text-white font-monospace">
                    {typeof manual.confidence === 'number' ? manual.confidence.toFixed(1) : manualConfidence.toFixed(1)}%
                  </span>
                </div>
              )}
            </div>

            {/* 6-Zone Regional Analysis (Hidden during DIP failure) */}
            {!isAdjudicated ? (
              <>
                <h6 className="fw-bold text-muted extra-small text-uppercase mt-2 mb-2">
                  <i className="fas fa-th-large me-1 text-cyan" style={{ color: 'var(--rad-cyan)' }}></i> 6-Zone Regional Analysis
                </h6>
                <div className="row g-1.5 mt-auto">
                  {zoneKeys.map(({ key, short, name }) => {
                    const z = zones[key] || zones[short] || {};
                    const status = z.status || 'NORMAL';
                    return (
                      <div key={key} className="col-6">
                        <div className="p-2 rounded bg-surface border border-secondary border-opacity-25 d-flex justify-content-between align-items-center">
                          <div>
                            <strong className="text-white extra-small d-block font-monospace">{short}</strong>
                            <span className="text-secondary extra-small" style={{ fontSize: '0.68rem' }}>{name.split(' ')[0]}</span>
                          </div>
                          <div className="text-end">
                            {getStatusBadge(status)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="p-3 rounded bg-surface border border-secondary border-opacity-25 mt-auto text-center">
                <div className="d-flex align-items-center justify-content-center gap-2 mb-1.5 text-warning">
                  <i className="fas fa-exclamation-triangle"></i>
                  <span className="fw-bold small">6-Zone Regional Analysis Suspended</span>
                </div>
                <p className="text-secondary extra-small mb-0">
                  Manual DIP failed to identify; regional analysis is suspended and the final diagnostic determination is from the ML model.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Method 2: DenseNet-121 Deep Learning */}
        <div className="col-lg-6">
          <div className="p-3 rounded-3 bg-dark border border-secondary border-opacity-25 h-100 d-flex flex-column">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="fw-bold text-white small d-flex align-items-center gap-2">
                <i className="fas fa-network-wired text-cyan" style={{ color: 'var(--rad-cyan)' }}></i>
                <span>Method 2: Deep Learning (DenseNet-121)</span>
              </span>
              <span className="badge bg-secondary-subtle text-secondary extra-small">Neural Network</span>
            </div>

            {/* Classification & Confidence Score */}
            <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 my-2 p-2.5 rounded bg-surface">
              <div>
                <small className="text-muted extra-small d-block text-uppercase fw-bold">Prediction</small>
                {ml.prediction === 'PNEUMONIA' ? (
                  <span className="badge rad-badge-pneumonia fs-6 px-2.5 py-1 text-wrap text-start">
                    Pneumonia Suspected — Further Clinical Evaluation Required
                  </span>
                ) : (
                  <span className="badge rad-badge-normal fs-6 px-2.5 py-1">Normal</span>
                )}
              </div>
              <div className="text-end">
                <small className="text-muted extra-small d-block text-uppercase fw-bold">Confidence Score</small>
                <span className="fw-bold fs-5 text-white font-monospace">{mlConf.toFixed(1)}%</span>
              </div>
            </div>

            {/* Concordance summary */}
            <div className="p-3 rounded bg-surface border border-secondary border-opacity-25 mt-auto">
              <div className="d-flex justify-content-between align-items-center">
                <span className="extra-small text-muted fw-bold text-uppercase">Dual-Method Agreement</span>
                <span className="badge bg-success-subtle text-success extra-small">
                  <i className="fas fa-check-circle me-1"></i> FULL CONCORDANCE
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DualMethodComparisonCard;
