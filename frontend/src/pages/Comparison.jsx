import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { comparisonAPI, getImageUrl } from '../services/api';

const Comparison = () => {
  const [comparisonData, setComparisonData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchComparisonData();
  }, []);

  const fetchComparisonData = async () => {
    try {
      setLoading(true);
      const res = await comparisonAPI.getComparisonData();
      if (res.data.success && res.data.comparisonData) {
        setComparisonData(res.data.comparisonData);
      }
    } catch (err) {
      console.error('Fetch comparison error:', err);
      setErrorMsg('Failed to load dataset comparison metrics.');
    } finally {
      setLoading(false);
    }
  };

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
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h2 className="fw-extrabold text-dark mb-1 d-flex align-items-center gap-2">
            <i className="fas fa-balance-scale text-teal" style={{ color: '#14b8a6' }}></i>
            <span>Dataset-Level Method Comparison</span>
          </h2>
          <p className="text-muted small mb-0">
            Empirical benchmarking of Traditional DIP vs DenseNet-121 on the Kaggle Chest X-Ray test cohort.
          </p>
        </div>
        <div className="d-flex gap-2">
          <Link to="/upload" className="btn btn-primary btn-sm d-inline-flex align-items-center gap-1.5 shadow-sm">
            <i className="fas fa-microscope"></i> Live Analysis
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
        <div className="d-flex justify-content-center align-items-center py-5">
          <div className="spinner-border text-teal" role="status">
            <span className="visually-hidden">Loading benchmark metrics...</span>
          </div>
        </div>
      ) : comparisonData ? (
        <>
          {/* Top Performance Stats Cards */}
          <div className="row g-3 mb-4">
            <div className="col-md-4">
              <div className="card h-100 shadow-sm border-0 stat-card-primary">
                <div className="card-body p-3">
                  <span className="text-secondary extra-small fw-bold text-uppercase d-block mb-1">
                    Traditional Method Accuracy
                  </span>
                  <h3 className="fw-extrabold text-dark mb-0">
                    {typeof manualMetrics.accuracy === 'number'
                      ? `${(manualMetrics.accuracy * 100).toFixed(1)}%`
                      : 'N/A'}
                  </h3>
                  <small className="text-muted extra-small">Calibrated feature thresholding</small>
                </div>
              </div>
            </div>

            <div className="col-md-4">
              <div className="card h-100 shadow-sm border-0 stat-card-success">
                <div className="card-body p-3">
                  <span className="text-secondary extra-small fw-bold text-uppercase d-block mb-1">
                    DenseNet121 CNN Accuracy
                  </span>
                  <h3 className="fw-extrabold text-success mb-0">
                    {typeof mlMetrics.accuracy === 'number'
                      ? `${(mlMetrics.accuracy * 100).toFixed(1)}%`
                      : 'N/A'}
                  </h3>
                  <small className="text-muted extra-small">Transfer learning on Chest X-Rays</small>
                </div>
              </div>
            </div>

            <div className="col-md-4">
              <div className="card h-100 shadow-sm border-0 stat-card-warning">
                <div className="card-body p-3">
                  <span className="text-secondary extra-small fw-bold text-uppercase d-block mb-1">
                    Method Agreement Rate
                  </span>
                  <h3 className="fw-extrabold text-teal mb-0" style={{ color: '#0d9488' }}>
                    {typeof comparisonData.agreement_rate === 'number'
                      ? `${(comparisonData.agreement_rate * 100).toFixed(1)}%`
                      : comparisonData.agreement_rate || 'N/A'}
                  </h3>
                  <small className="text-muted extra-small">Cohort concordance between methods</small>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Metrics Comparison Table */}
          <div className="card shadow-sm border-0 mb-4 overflow-hidden">
            <div className="card-header py-3 bg-dark text-white d-flex align-items-center justify-content-between">
              <h5 className="mb-0 fw-bold d-flex align-items-center gap-2">
                <i className="fas fa-table" style={{ color: '#14b8a6' }}></i>
                <span>Statistical Benchmark Metrics</span>
              </h5>
              <span className="badge bg-teal-subtle text-teal border border-teal-subtle">Test Partition</span>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover table-bordered align-middle mb-0 text-center">
                  <thead className="table-light extra-small text-uppercase">
                    <tr>
                      <th className="text-start ps-4">Diagnostic Metric</th>
                      <th>Traditional DIP Engine</th>
                      <th>DenseNet-121 Neural Network</th>
                      <th>Performance Delta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metricsList.map((item, idx) => {
                      const mVal = typeof manualMetrics[item.mKey] === 'number' ? manualMetrics[item.mKey] * 100 : null;
                      const mlVal = typeof mlMetrics[item.mlKey] === 'number' ? mlMetrics[item.mlKey] * 100 : null;
                      const delta = mVal !== null && mlVal !== null ? mlVal - mVal : null;

                      return (
                        <tr key={idx}>
                          <td className="text-start ps-4 fw-bold text-dark">{item.name}</td>
                          <td>{mVal !== null ? `${mVal.toFixed(2)}%` : '-'}</td>
                          <td className="fw-bold text-teal" style={{ color: '#0d9488' }}>
                            {mlVal !== null ? `${mlVal.toFixed(2)}%` : '-'}
                          </td>
                          <td>
                            {delta !== null ? (
                              delta > 0 ? (
                                <span className="badge bg-success-subtle text-success">
                                  +{delta.toFixed(2)}% (ML Higher)
                                </span>
                              ) : delta < 0 ? (
                                <span className="badge bg-warning-subtle text-warning">
                                  {delta.toFixed(2)}% (DIP Higher)
                                </span>
                              ) : (
                                <span className="badge bg-secondary-subtle text-secondary">0.00%</span>
                              )
                            ) : (
                              '-'
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Comparison Charts and Confusion Matrices */}
          <div className="row g-4 mb-4">
            <div className="col-md-6">
              <div className="card h-100 shadow-sm border-0 text-center p-3">
                <div className="card-body d-flex flex-column align-items-center">
                  <h6 className="fw-bold text-dark mb-3">
                    <i className="fas fa-chart-bar text-primary me-1"></i> Multi-Metric Comparison Chart
                  </h6>
                  <img
                    src={getImageUrl('results/comparison_chart.png')}
                    alt="Performance Comparison Chart"
                    className="img-fluid rounded shadow-sm my-auto"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="col-md-6">
              <div className="card h-100 shadow-sm border-0 text-center p-3">
                <div className="card-body d-flex flex-column align-items-center">
                  <h6 className="fw-bold text-dark mb-3">
                    <i className="fas fa-th text-teal me-1"></i> Confusion Matrices (Test Cohort)
                  </h6>
                  <div className="row g-2 w-100 my-auto">
                    <div className="col-6">
                      <small className="text-secondary fw-bold d-block mb-1">Traditional DIP</small>
                      <img
                        src={getImageUrl('results/manual_confusion_matrix.png')}
                        alt="Traditional Confusion Matrix"
                        className="img-fluid rounded shadow-sm"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    </div>
                    <div className="col-6">
                      <small className="text-secondary fw-bold d-block mb-1">DenseNet-121 CNN</small>
                      <img
                        src={getImageUrl('results/ml_confusion_matrix.png')}
                        alt="ML Confusion Matrix"
                        className="img-fluid rounded shadow-sm"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="card shadow-sm border-0 text-center py-5 mb-4">
          <div className="card-body p-4 p-md-5">
            <div
              className="stat-icon-wrapper bg-primary-subtle text-primary mx-auto mb-3"
              style={{ width: '72px', height: '72px', fontSize: '2rem' }}
            >
              <i className="fas fa-balance-scale"></i>
            </div>
            <h4 className="fw-bold text-dark mb-2">No Dataset Comparison Data Available</h4>
            <p className="text-secondary max-w-lg mx-auto mb-4 small leading-relaxed">
              The dataset-level benchmarking script evaluates both the traditional digital image processing heuristics and the deep learning neural network on the Kaggle chest X-ray test set.
            </p>

            <div
              className="p-3 bg-dark text-white rounded-3 d-inline-block text-start mb-4 shadow-sm"
              style={{ maxWidth: '500px', fontFamily: 'monospace', fontSize: '0.85rem' }}
            >
              <div className="text-muted extra-small mb-1"># Run comparison benchmark via terminal:</div>
              <div className="text-teal" style={{ color: '#5eead4' }}>python dip_engine/compare_methods.py</div>
            </div>

            <div>
              <Link to="/dashboard" className="btn btn-outline-primary btn-sm px-4 py-2">
                Return to Dashboard
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Comparison;
