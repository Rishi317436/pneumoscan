import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { scanAPI } from '../services/api';

const ResultsHistory = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    try {
      setLoading(true);
      const res = await scanAPI.getResults();
      if (res.data.success) {
        setResults(res.data.results || []);
      } else {
        setErrorMsg(res.data.message || 'Failed to load results.');
      }
    } catch (err) {
      console.error('Fetch results error:', err);
      setErrorMsg('Failed to load past detection results.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h2 className="fw-extrabold text-dark mb-1 d-flex align-items-center gap-2">
            <i className="fas fa-poll text-teal" style={{ color: '#14b8a6' }}></i>
            <span>Detection Results & Scan History</span>
          </h2>
          <p className="text-muted small mb-0">
            Dual-method pneumonia classification metrics and comparative agreements.
          </p>
        </div>
        <div className="d-flex gap-2">
          <Link to="/comparison" className="btn btn-outline-primary btn-sm d-inline-flex align-items-center gap-1.5">
            <i className="fas fa-balance-scale"></i> Dataset Comparison
          </Link>
          <Link to="/upload" className="btn btn-primary btn-sm d-inline-flex align-items-center gap-1.5 shadow-sm">
            <i className="fas fa-plus"></i> New Analysis
          </Link>
        </div>
      </div>

      {errorMsg && (
        <div className="alert alert-danger alert-dismissible fade show shadow-sm border-0">
          <i className="fas fa-exclamation-triangle me-2"></i>
          {errorMsg}
          <button type="button" className="btn-close" onClick={() => setErrorMsg('')}></button>
        </div>
      )}

      {loading ? (
        <div className="d-flex justify-content-center align-items-center py-5">
          <div className="spinner-border text-teal" role="status">
            <span className="visually-hidden">Loading history...</span>
          </div>
        </div>
      ) : (
        <div className="card shadow-sm border-0 mb-4 overflow-hidden">
          <div className="card-header py-3 bg-dark text-white d-flex align-items-center justify-content-between">
            <h5 className="mb-0 fw-bold d-flex align-items-center gap-2">
              <i className="fas fa-history" style={{ color: '#14b8a6' }}></i>
              <span>Recent Chest X-Ray Analyses</span>
            </h5>
            <span className="badge bg-teal-subtle text-teal border border-teal-subtle">
              {results.length} Total Scans
            </span>
          </div>

          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-dark text-uppercase extra-small">
                  <tr>
                    <th className="ps-4">Scan File</th>
                    <th>Traditional (DIP)</th>
                    <th>Manual Score</th>
                    <th>Deep Learning (ML)</th>
                    <th>ML Confidence</th>
                    <th>Agreement</th>
                    <th>Date</th>
                    <th className="text-end pe-4">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {results.length > 0 ? (
                    results.map((r) => {
                      const filename = r.scanId?.filename || (r.originalImage ? r.originalImage.split(/[\\/]/).pop() : 'Chest_XRay.jpg');
                      const manualPred = r.manualDetection?.prediction;
                      const manualScore = typeof r.manualDetection?.score === 'number' ? `${r.manualDetection.score.toFixed(1)}%` : 'N/A';
                      const mlPred = r.mlDetection?.prediction;
                      const mlConf = typeof r.mlDetection?.confidence === 'number'
                        ? `${(r.mlDetection.confidence * (r.mlDetection.confidence <= 1 ? 100 : 1)).toFixed(1)}%`
                        : 'N/A';
                      const agree = r.comparison?.agreementStatus;

                      return (
                        <tr key={r._id}>
                          <td className="ps-4 fw-semibold text-dark">
                            <i className="fas fa-file-image me-2 text-teal" style={{ color: '#14b8a6' }}></i>
                            {filename}
                          </td>
                          <td>
                            {manualPred === 'PNEUMONIA' ? (
                              <span className="badge bg-danger-subtle text-danger border border-danger-subtle px-2.5 py-1.5 text-wrap text-start">
                                <i className="fas fa-exclamation-triangle me-1"></i> Pneumonia Suspected — Further Clinical Evaluation Required
                              </span>
                            ) : manualPred === 'NORMAL' ? (
                              <span className="badge bg-success-subtle text-success border border-success-subtle px-2.5 py-1.5">
                                <i className="fas fa-check-circle me-1"></i> Normal
                              </span>
                            ) : (
                              <span className="badge bg-secondary-subtle text-secondary px-2.5 py-1.5">N/A</span>
                            )}
                          </td>
                          <td>
                            <span className="fw-bold text-dark">{manualScore}</span>
                          </td>
                          <td>
                            {mlPred === 'PNEUMONIA' ? (
                              <span className="badge bg-danger text-white px-2.5 py-1.5 text-wrap text-start">
                                <i className="fas fa-robot me-1"></i> Pneumonia Suspected — Further Clinical Evaluation Required
                              </span>
                            ) : mlPred === 'NORMAL' ? (
                              <span className="badge bg-success text-white px-2.5 py-1.5">
                                <i className="fas fa-robot me-1"></i> Normal
                              </span>
                            ) : (
                              <span className="badge bg-secondary px-2.5 py-1.5">N/A</span>
                            )}
                          </td>
                          <td>
                            <span className="fw-extrabold text-teal" style={{ color: '#14b8a6' }}>
                              {mlConf}
                            </span>
                          </td>
                          <td>
                            <span className="badge bg-success text-white px-2.5 py-1.5">
                              <i className="fas fa-check-circle me-1"></i> AGREE
                            </span>
                          </td>
                          <td className="text-secondary extra-small">
                            {new Date(r.createdAt || Date.now()).toLocaleDateString()}
                          </td>
                          <td className="text-end pe-4">
                            <Link to={`/scan/detail/${r._id}`} className="btn btn-outline-primary btn-sm px-3 py-1">
                              View Detail &rarr;
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="8" className="text-center py-5 text-muted">
                        <i className="fas fa-lungs mb-3 text-muted" style={{ fontSize: '3rem' }}></i>
                        <p className="mb-0">
                          No analysis results available yet.{' '}
                          <Link to="/upload" className="fw-bold text-teal" style={{ color: '#14b8a6' }}>
                            Upload a Chest X-Ray to begin
                          </Link>.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultsHistory;
