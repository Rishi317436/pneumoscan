import React from 'react';
import { useComparison } from '../hooks/useComparison';
import { getImageUrl } from '../services/api';
import MetricCard from '../components/common/MetricCard';
import { SkeletonCard } from '../components/common/SkeletonLoader';

const BenchmarkComparison = () => {
  const { data, isLoading } = useComparison();

  const comparisonData = data?.comparisonData;
  const manualMetrics = comparisonData?.manual_metrics || {};
  const mlMetrics = comparisonData?.ml_metrics || {};

  const metricsList = [
    { name: 'Classification Accuracy', mKey: 'accuracy', mlKey: 'accuracy' },
    { name: 'Precision (PPV)', mKey: 'precision', mlKey: 'precision' },
    { name: 'Recall / Sensitivity (TPR)', mKey: 'recall', mlKey: 'recall' },
    { name: 'Specificity (TNR)', mKey: 'specificity', mlKey: 'specificity' },
    { name: 'F1-Score', mKey: 'f1', mlKey: 'f1' },
    { name: 'ROC-AUC Score', mKey: 'roc_auc', mlKey: 'roc_auc' }
  ];

  return (
    <div className="container-fluid py-4 px-lg-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h2 className="fw-extrabold text-white mb-1 d-flex align-items-center gap-2">
            <i className="fas fa-balance-scale text-cyan" style={{ color: 'var(--rad-cyan)' }}></i>
            <span>Dataset-Level Empirical Benchmark</span>
          </h2>
          <p className="text-secondary small mb-0">
            Comparative performance of Handcrafted Feature Thresholding vs DenseNet-121 CNN on the 624-image test cohort.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="row g-4 mb-4">
          <div className="col-md-4"><SkeletonCard height="80px" /></div>
          <div className="col-md-4"><SkeletonCard height="80px" /></div>
          <div className="col-md-4"><SkeletonCard height="80px" /></div>
        </div>
      ) : comparisonData ? (
        <>
          {/* Top 3 Benchmark KPI Cards */}
          <div className="row g-3 mb-4">
            <div className="col-md-4">
              <MetricCard
                title="Traditional DIP Accuracy"
                value={typeof manualMetrics.accuracy === 'number' ? `${(manualMetrics.accuracy * 100).toFixed(1)}%` : 'N/A'}
                subtitle="Calibrated spatial GLCM/LBP thresholding"
                icon="fa-cogs"
                color="amber"
              />
            </div>
            <div className="col-md-4">
              <MetricCard
                title="DenseNet-121 CNN Accuracy"
                value={typeof mlMetrics.accuracy === 'number' ? `${(mlMetrics.accuracy * 100).toFixed(1)}%` : 'N/A'}
                subtitle="Deep transfer learning on Chest X-Rays"
                icon="fa-network-wired"
                color="emerald"
                glow
              />
            </div>
            <div className="col-md-4">
              <MetricCard
                title="Cohort Agreement Rate"
                value={typeof comparisonData.agreement_rate === 'number' ? `${(comparisonData.agreement_rate * 100).toFixed(1)}%` : 'N/A'}
                subtitle="Dual-method mutual consensus"
                icon="fa-handshake"
                color="cyan"
              />
            </div>
          </div>

          {/* Statistical Comparison Table */}
          <div className="rad-card mb-4 overflow-hidden">
            <div className="rad-card-header">
              <span className="fw-bold text-white small text-uppercase">
                <i className="fas fa-table me-2 text-cyan" style={{ color: 'var(--rad-cyan)' }}></i>
                Empirical Test Partition Metrics
              </span>
              <span className="badge bg-dark border border-secondary text-cyan font-monospace extra-small">
                624 Test Cases
              </span>
            </div>
            <div className="rad-card-body p-0">
              <div className="table-responsive">
                <table className="table table-dark table-hover align-middle mb-0 text-center extra-small font-monospace">
                  <thead>
                    <tr className="border-bottom border-secondary border-opacity-25 text-muted text-uppercase">
                      <th className="text-start ps-4 py-3">Diagnostic Metric</th>
                      <th>Traditional DIP Heuristic</th>
                      <th>DenseNet-121 Deep CNN</th>
                      <th>Performance Delta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metricsList.map((item, idx) => {
                      const mVal = typeof manualMetrics[item.mKey] === 'number' ? manualMetrics[item.mKey] * 100 : null;
                      const mlVal = typeof mlMetrics[item.mlKey] === 'number' ? mlMetrics[item.mlKey] * 100 : null;
                      const delta = mVal !== null && mlVal !== null ? mlVal - mVal : null;

                      return (
                        <tr key={idx} className="border-bottom border-secondary border-opacity-10">
                          <td className="text-start ps-4 fw-bold text-white">{item.name}</td>
                          <td className="text-secondary">{mVal !== null ? `${mVal.toFixed(2)}%` : '-'}</td>
                          <td className="fw-bold text-cyan" style={{ color: 'var(--rad-cyan)' }}>
                            {mlVal !== null ? `${mlVal.toFixed(2)}%` : '-'}
                          </td>
                          <td>
                            {delta !== null ? (
                              delta > 0 ? (
                                <span className="badge rad-badge-normal">+{delta.toFixed(2)}% (CNN Superior)</span>
                              ) : delta < 0 ? (
                                <span className="badge rad-badge-disagree">{delta.toFixed(2)}% (DIP Superior)</span>
                              ) : (
                                <span className="badge bg-secondary-subtle text-secondary">0.00%</span>
                              )
                            ) : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Graphical Benchmark Assets */}
          <div className="row g-4 mb-4">
            <div className="col-lg-6">
              <div className="rad-card p-4 h-100 text-center">
                <h6 className="fw-bold text-white small text-uppercase mb-3">
                  <i className="fas fa-chart-bar me-2 text-cyan" style={{ color: 'var(--rad-cyan)' }}></i>
                  Multi-Metric Performance Comparison Chart
                </h6>
                <img
                  src={getImageUrl('results/comparison_chart.png')}
                  alt="Benchmark Chart"
                  className="img-fluid rounded shadow my-auto"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              </div>
            </div>

            <div className="col-lg-6">
              <div className="rad-card p-4 h-100 text-center">
                <h6 className="fw-bold text-white small text-uppercase mb-3">
                  <i className="fas fa-th me-2 text-cyan" style={{ color: 'var(--rad-cyan)' }}></i>
                  Test Cohort Confusion Matrices
                </h6>
                <div className="row g-2 w-100 my-auto">
                  <div className="col-6">
                    <small className="text-muted extra-small d-block mb-1">Traditional DIP Matrix</small>
                    <img
                      src={getImageUrl('results/manual_confusion_matrix.png')}
                      alt="Traditional Matrix"
                      className="img-fluid rounded shadow"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  </div>
                  <div className="col-6">
                    <small className="text-muted extra-small d-block mb-1">DenseNet-121 Matrix</small>
                    <img
                      src={getImageUrl('results/ml_confusion_matrix.png')}
                      alt="ML Matrix"
                      className="img-fluid rounded shadow"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="rad-card p-5 text-center">
          <i className="fas fa-chart-line text-muted fs-1 mb-3"></i>
          <h5 className="fw-bold text-white mb-2">Benchmark Not Computed</h5>
          <p className="text-secondary small mb-3">Run the comparison evaluation script in the backend ML engine.</p>
          <code className="p-2.5 rounded bg-dark border border-secondary text-cyan font-monospace d-inline-block">
            python dip_engine/compare_methods.py
          </code>
        </div>
      )}
    </div>
  );
};

export default BenchmarkComparison;
