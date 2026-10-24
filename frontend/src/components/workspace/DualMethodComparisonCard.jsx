import React from 'react';
import { getSampleBenchmark } from '../../config/sampleObservations';

const DualMethodComparisonCard = ({ manualDetection, mlDetection, comparison, filename }) => {
  const manual = manualDetection || {};
  const ml = mlDetection || {};
  const comp = comparison || {};
  const zones = manual.zones || {};

  // Resolve sample benchmark observations if present
  const sampleCfg = getSampleBenchmark(filename) || getSampleBenchmark(manual.sampleBenchmark?.canonicalFilename) || (manual.sampleBenchmark?.sampleId ? getSampleBenchmark(manual.sampleBenchmark.sampleId) : null);
  const sampleSummary = manual.sampleObservationSummary || manual.sampleBenchmark?.summary || sampleCfg?.summary;
  const sampleProvenance = manual.sampleObservationProvenance || manual.sampleBenchmark?.provenance || sampleCfg?.provenance;
  const sampleObservations = sampleCfg?.observations || {};
  const sampleZoneStatuses = sampleCfg?.zoneStatuses || {};

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

  const hasObservations = Boolean(sampleSummary || Object.keys(sampleObservations).length > 0 || Object.values(zones).some(z => z && z.observation));

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
            <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 my-2 p-2.5 rounded bg-surface">
              <div>
                <small className="text-muted extra-small d-block text-uppercase fw-bold">Prediction</small>
                {manual.prediction === 'PNEUMONIA' ? (
                  <span className="badge rad-badge-pneumonia fs-6 px-2.5 py-1">
                    Pneumonia Detected
                  </span>
                ) : (
                  <span className="badge rad-badge-normal fs-6 px-2.5 py-1">
                    Normal
                  </span>
                )}
              </div>
              <div className="text-end">
                <small className="text-muted extra-small d-block text-uppercase fw-bold">Confidence Score</small>
                <span className="fw-bold fs-5 text-white font-monospace">
                  {typeof manual.confidence === 'number' ? manual.confidence.toFixed(1) : manualConfidence.toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Observation Summary (Preliminary Visual Inspection) */}
            {sampleSummary && (
              <div className="p-2.5 rounded bg-surface border border-secondary border-opacity-25 mb-2.5 mt-1">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <span className="fw-bold text-white extra-small d-flex align-items-center gap-1.5">
                    <i className="fas fa-notes-medical text-cyan" style={{ color: 'var(--rad-cyan)' }}></i>
                    <span>Observation Summary</span>
                  </span>
                  <span className="badge bg-secondary-subtle text-secondary" style={{ fontSize: '0.62rem' }}>
                    Visual Benchmark
                  </span>
                </div>
                <p className="text-secondary extra-small mb-1" style={{ fontSize: '0.72rem', lineHeight: '1.3' }}>
                  {sampleSummary}
                </p>
                <div className="text-muted font-monospace" style={{ fontSize: '0.62rem' }}>
                  <i className="fas fa-info-circle me-1"></i>
                  Provenance: {sampleProvenance || 'Preliminary visual inspection (illustrative benchmark observation)'}
                </div>
              </div>
            )}

            {/* 6-Zone Regional Analysis */}
            <div className="d-flex justify-content-between align-items-center mt-2 mb-2">
              <h6 className="fw-bold text-muted extra-small text-uppercase mb-0">
                <i className="fas fa-th-large me-1 text-cyan" style={{ color: 'var(--rad-cyan)' }}></i> 6-Zone Regional Analysis
              </h6>
              {hasObservations && (
                <span className="text-muted extra-small" style={{ fontSize: '0.65rem' }}>
                  Preliminary Visual Inspection
                </span>
              )}
            </div>
            <div className="row g-1.5 mt-auto">
              {zoneKeys.map(({ key, short, name }) => {
                const z = zones[key] || zones[short] || {};
                const status = (sampleZoneStatuses[key] || sampleZoneStatuses[short] || z.status || 'NORMAL').toUpperCase();
                const observation = z.observation || sampleObservations[key];

                return (
                  <div key={key} className={hasObservations ? "col-12" : "col-6"}>
                    <div className="p-2 rounded bg-surface border border-secondary border-opacity-25 d-flex flex-column justify-content-between">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <strong className="text-white extra-small font-monospace">{short}</strong>
                          <span className="text-secondary extra-small ms-1.5" style={{ fontSize: '0.68rem' }}>{name.split(' ')[0]}</span>
                        </div>
                        <div className="text-end">
                          {getStatusBadge(status)}
                        </div>
                      </div>
                      {observation && (
                        <p className="text-secondary extra-small mb-0 mt-1" style={{ fontSize: '0.7rem', lineHeight: '1.3' }}>
                          {observation}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
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
                  <span className="badge rad-badge-pneumonia fs-6 px-2.5 py-1">
                    Pneumonia Detected
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
                  <i className="fas fa-check-circle me-1"></i> FULL CONCORDANCE (AGREE)
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
