import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { reportAPI } from '../services/api';

const Reports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await reportAPI.getReports();
      if (res.data.success) {
        setReports(res.data.reports || []);
      } else {
        setErrorMsg(res.data.message || 'Failed to load diagnostic reports.');
      }
    } catch (err) {
      console.error('Fetch reports error:', err);
      setErrorMsg('Failed to retrieve diagnostic reports from backend.');
    } finally {
      setLoading(false);
    }
  };

  const filteredReports = useMemo(() => {
    if (!searchTerm.trim()) return reports;
    const term = searchTerm.toLowerCase();
    return reports.filter(r => {
      const detection = r.detectionId && typeof r.detectionId === 'object' ? r.detectionId : {};
      const pred = (detection.mlDetection?.prediction || detection.manualDetection?.prediction || (r.findings && r.findings.includes('PNEUMONIA') ? 'pneumonia' : 'normal')).toLowerCase();
      const reportId = (r.reportId || (r._id ? r._id.slice(-6) : '')).toLowerCase();
      const findings = (r.findings || '').toLowerCase();
      const impression = (r.impression || '').toLowerCase();
      const filename = (detection.scanId?.filename || '').toLowerCase();

      return (
        pred.includes(term) ||
        findings.includes(term) ||
        impression.includes(term) ||
        reportId.includes(term) ||
        filename.includes(term)
      );
    });
  }, [reports, searchTerm]);

  return (
    <div className="pacs-workspace container-fluid py-4 px-lg-5">
      <div className="workspace-header mb-4">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
          <div>
            <h2 className="pacs-title mb-1">
              <i className="fas fa-file-medical text-cyan me-2"></i>Diagnostic Reports Archive
            </h2>
            <p className="text-secondary small mb-0">
              Access structured Chest X-Ray impression reports, findings summaries, and verification audit trails.
            </p>
          </div>
          <div className="d-flex gap-2">
            <Link to="/workspace" className="glass-btn primary">
              <i className="fas fa-microscope me-2"></i>New Workspace Analysis
            </Link>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="alert alert-danger d-flex align-items-center mb-4">
          <i className="fas fa-exclamation-triangle me-2"></i>
          <div>{errorMsg}</div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="rad-card p-3 mb-4">
        <div className="row g-3 align-items-center">
          <div className="col-md-6">
            <div className="input-group">
              <span className="input-group-text text-muted">
                <i className="fas fa-search"></i>
              </span>
              <input
                type="text"
                className="form-control"
                placeholder="Search findings, impressions, or report IDs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="col-md-6 text-md-end text-muted small">
            Displaying <strong className="text-cyan">{filteredReports.length}</strong> of {reports.length} diagnostic reports
          </div>
        </div>
      </div>

      {loading ? (
        <div className="d-flex justify-content-center align-items-center py-5">
          <div className="spinner-border text-cyan" role="status">
            <span className="visually-hidden">Loading reports...</span>
          </div>
        </div>
      ) : filteredReports.length > 0 ? (
        <div className="row g-4">
          {filteredReports.map((r) => {
            const detection = r.detectionId && typeof r.detectionId === 'object' ? r.detectionId : {};
            const detectionId = detection._id || r.detectionId;
            const filename = detection.scanId?.filename || 'Chest_XRay_Scan.jpg';

            let prediction = detection.mlDetection?.prediction || detection.manualDetection?.prediction;
            let confidence = 0;

            if (typeof detection.mlDetection?.confidence === 'number') {
              confidence = detection.mlDetection.confidence <= 1
                ? detection.mlDetection.confidence * 100
                : detection.mlDetection.confidence;
            } else if (typeof detection.manualDetection?.confidence === 'number') {
              confidence = detection.manualDetection.confidence;
            } else if (typeof detection.manualDetection?.score === 'number') {
              const s = detection.manualDetection.score;
              confidence = (prediction === 'NORMAL' && s < 50) ? (100 - s) : s;
            }

            if (!prediction && r.findings) {
              const upper = r.findings.toUpperCase();
              if (upper.includes('PNEUMONIA')) {
                prediction = 'PNEUMONIA';
              } else if (upper.includes('NORMAL')) {
                prediction = 'NORMAL';
              }
            }

            if (!confidence && r.findings) {
              const match = r.findings.match(/Confidence:\s*([\d.]+)%/i);
              if (match) {
                confidence = parseFloat(match[1]);
              }
            }

            if (!prediction) {
              prediction = 'NORMAL';
            }

            const isPneumonia = prediction.toUpperCase() === 'PNEUMONIA';

            return (
              <div className="col-md-6 col-lg-4" key={r._id}>
                <div className="rad-card p-4 h-100 d-flex flex-column">
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <div className="d-flex align-items-center gap-2">
                      <div className="p-2 rounded-3 glass-item text-cyan border border-secondary border-opacity-25">
                        <i className="fas fa-file-medical-alt fs-5"></i>
                      </div>
                      <div>
                        <h6 className="text-white fw-bold mb-0">Diagnostic Report</h6>
                        <small className="text-secondary">
                          {new Date(r.createdAt || Date.now()).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </small>
                      </div>
                    </div>
                    <span className="badge bg-secondary text-white font-monospace small">
                      {r.reportId || (r._id ? r._id.slice(-6).toUpperCase() : 'REPORT')}
                    </span>
                  </div>

                  <div className="flex-grow-1 mb-3">
                    {/* Primary Diagnostic Status */}
                    <div
                      className="p-3 rounded-3 mb-3 d-flex align-items-center justify-content-between"
                      style={{
                        background: isPneumonia ? 'rgba(255, 51, 102, 0.08)' : 'rgba(57, 255, 20, 0.08)',
                        border: `1px solid ${isPneumonia ? 'rgba(255, 51, 102, 0.3)' : 'rgba(57, 255, 20, 0.3)'}`
                      }}
                    >
                      <div>
                        <span className="text-secondary extra-small fw-bold text-uppercase d-block mb-1">
                          Diagnostic Status
                        </span>
                        <span className={`badge ${isPneumonia ? 'rad-badge-pneumonia' : 'rad-badge-normal'} fs-6 px-3 py-1.5 text-wrap text-start`}>
                          <i className={`fas ${isPneumonia ? 'fa-exclamation-triangle' : 'fa-check-circle'} me-1.5`}></i>
                          {isPneumonia ? 'Pneumonia Suspected — Further Clinical Evaluation Required' : 'Normal'}
                        </span>
                      </div>
                      <div className="text-end">
                        <span className="text-secondary extra-small fw-bold text-uppercase d-block mb-1">
                          Confidence
                        </span>
                        <span
                          className="fw-bold fs-5 font-monospace"
                          style={{ color: isPneumonia ? '#ff3366' : 'var(--lightsaber-green, #39ff14)' }}
                        >
                          {confidence > 0 ? `${confidence.toFixed(1)}%` : '--'}
                        </span>
                      </div>
                    </div>

                    {/* Clean Clinical Summary */}
                    <div className="p-3 glass-item rounded-3 border border-secondary border-opacity-25">
                      <div className="d-flex align-items-center justify-content-between mb-1.5">
                        <span className="text-muted extra-small fw-bold text-uppercase">
                          <i className="fas fa-stethoscope me-1 text-cyan"></i>Diagnostic Summary
                        </span>
                        <span className="text-secondary extra-small text-truncate" style={{ maxWidth: '140px' }} title={filename}>
                          <i className="fas fa-image me-1"></i>{filename}
                        </span>
                      </div>
                      <p className="text-white small mb-0">
                        {r.impression || (isPneumonia
                          ? 'Focal opacification and infiltrative consolidation detected consistent with pneumonia.'
                          : 'Clear lung parenchyma without evidence of active consolidation or pneumonia.')}
                      </p>
                    </div>
                  </div>

                  <div className="border-top border-secondary opacity-25 pt-3 mt-auto d-flex justify-content-between align-items-center">
                    <span className="text-muted small">
                      <i className="fas fa-download me-1"></i>Downloads: {r.downloadCount || 0}
                    </span>
                    <Link
                      to={`/study/${detectionId}`}
                      className="glass-btn small px-3"
                    >
                      <i className="fas fa-external-link-alt me-1"></i> Open Study
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="pacs-card text-center py-5">
          <div className="py-4">
            <i className="fas fa-folder-open text-muted mb-3" style={{ fontSize: '3.5rem' }}></i>
            <h5 className="text-light fw-bold">No Diagnostic Reports Found</h5>
            <p className="text-muted small mb-4">
              {searchTerm ? 'No reports match your search query.' : 'Run a Chest X-Ray scan analysis in the workspace to generate diagnostic reports.'}
            </p>
            <Link to="/workspace" className="glass-btn primary px-4">
              <i className="fas fa-microscope me-2"></i>Go to Workspace
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
