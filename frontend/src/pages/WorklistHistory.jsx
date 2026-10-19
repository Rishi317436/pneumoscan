import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useScans, useDeleteScan } from '../hooks/useScans';
import { SkeletonTableRow } from '../components/common/SkeletonLoader';
import { useToast } from '../context/ToastContext';

const WorklistHistory = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [prediction, setPrediction] = useState('');
  const [agreement, setAgreement] = useState('');

  const { data, isLoading, refetch } = useScans(page, 10, search, prediction, agreement);
  const deleteMutation = useDeleteScan();
  const { addToast } = useToast();

  const results = data?.results || [];
  const pagination = data?.pagination || { page: 1, totalPages: 1, total: 0 };

  const handleDelete = async (id, filename) => {
    if (!window.confirm(`Delete study record '${filename}'? This cannot be undone.`)) return;

    try {
      await deleteMutation.mutateAsync(id);
      addToast(`Study '${filename}' removed from worklist.`, 'success');
    } catch (err) {
      console.error('Delete error:', err);
      addToast('Failed to delete study.', 'error');
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    refetch();
  };

  return (
    <div className="container-fluid py-4 px-lg-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h2 className="fw-extrabold text-white mb-1 d-flex align-items-center gap-2">
            <i className="fas fa-list-alt text-cyan" style={{ color: 'var(--rad-cyan)' }}></i>
            <span>Chest X-Ray Worklist</span>
          </h2>
          <p className="text-secondary small mb-0">
            Paginated repository of ingested Chest X-Rays, diagnostic classifications, and Grad-CAM saliencies.
          </p>
        </div>
        <Link to="/workspace" className="glass-btn primary small">
          <i className="fas fa-plus me-1.5"></i> Mount New Chest X-Ray
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="rad-card p-3 mb-4">
        <form className="row g-3 align-items-center" onSubmit={handleSearchSubmit}>
          <div className="col-md-4">
            <div className="input-group input-group-sm">
              <span className="input-group-text text-muted">
                <i className="fas fa-search"></i>
              </span>
              <input
                type="text"
                className="form-control"
                placeholder="Search by filename or symptoms..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="col-md-3">
            <select
              value={prediction}
              onChange={(e) => { setPrediction(e.target.value); setPage(1); }}
              className="form-select form-select-sm"
            >
              <option value="">All Diagnostic Calls</option>
              <option value="PNEUMONIA">Pneumonia Suspected</option>
              <option value="NORMAL">Normal</option>
            </select>
          </div>

          <div className="col-md-3">
            <select
              value={agreement}
              onChange={(e) => { setAgreement(e.target.value); setPage(1); }}
              className="form-select form-select-sm"
            >
              <option value="">All Concordance</option>
              <option value="AGREE">Concordant (Agree)</option>
              <option value="DISAGREE">Discordant (Disagree)</option>
            </select>
          </div>

          <div className="col-md-2 d-flex gap-2">
            <button type="submit" className="glass-btn small w-100 py-1.5">
              Filter
            </button>
            {(search || prediction || agreement) && (
              <button
                type="button"
                onClick={() => { setSearch(''); setPrediction(''); setAgreement(''); setPage(1); }}
                className="rad-btn-danger btn-sm px-2.5"
                title="Clear Filters"
              >
                <i className="fas fa-times"></i>
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Studies Worklist Table */}
      <div className="rad-card overflow-hidden mb-4">
        <div className="rad-card-header">
          <span className="fw-bold text-white small text-uppercase">
            <i className="fas fa-database me-2 text-cyan" style={{ color: 'var(--rad-cyan)' }}></i>
            Indexed Studies ({pagination.total} Records)
          </span>
          <span className="text-secondary extra-small font-monospace">Page {pagination.page} of {pagination.totalPages}</span>
        </div>

        <div className="rad-card-body p-0">
          <div className="table-responsive">
            <table className="table table-dark table-hover align-middle mb-0 extra-small">
              <thead>
                <tr className="border-bottom border-secondary border-opacity-25 text-muted text-uppercase">
                  <th className="ps-3 py-3">Study File</th>
                  <th>Traditional DIP</th>
                  <th>DenseNet-121</th>
                  <th>Confidence</th>
                  <th>Concordance</th>
                  <th>Date Ingested</th>
                  <th className="text-end pe-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => <SkeletonTableRow key={i} cols={7} />)
                ) : results.length > 0 ? (
                  results.map((scan) => {
                    const filename = scan.scanId?.filename || (scan.originalImage ? scan.originalImage.split(/[\\/]/).pop() : 'Study.jpeg');
                    const manualPred = scan.manualDetection?.prediction;
                    const mlPred = scan.mlDetection?.prediction;
                    const mlConf = typeof scan.mlDetection?.confidence === 'number'
                      ? (scan.mlDetection.confidence <= 1 ? scan.mlDetection.confidence * 100 : scan.mlDetection.confidence).toFixed(1)
                      : '0.0';

                    return (
                      <tr key={scan._id} className="border-bottom border-secondary border-opacity-10">
                        <td className="ps-3 fw-bold text-white">
                          <i className="fas fa-file-image me-2 text-cyan" style={{ color: 'var(--rad-cyan)' }}></i>
                          {filename}
                        </td>
                        <td>
                          {manualPred === 'PNEUMONIA' ? (
                            <span className="badge rad-badge-pneumonia text-wrap text-start">Pneumonia Suspected — Further Clinical Evaluation Required</span>
                          ) : (
                            <span className="badge rad-badge-normal">Normal</span>
                          )}
                        </td>
                        <td>
                          {mlPred === 'PNEUMONIA' ? (
                            <span className="badge rad-badge-pneumonia text-wrap text-start">Pneumonia Suspected — Further Clinical Evaluation Required</span>
                          ) : (
                            <span className="badge rad-badge-normal">Normal</span>
                          )}
                        </td>
                        <td className="font-monospace text-cyan fw-bold" style={{ color: 'var(--rad-cyan)' }}>
                          {mlConf}%
                        </td>
                        <td>
                          {scan.comparison?.agreementStatus === 'AGREE' ? (
                            <span className="badge rad-badge-agree">AGREE</span>
                          ) : (
                            <span className="badge rad-badge-disagree">DISAGREE</span>
                          )}
                        </td>
                        <td className="text-secondary font-monospace">
                          {new Date(scan.createdAt).toLocaleDateString()}
                        </td>
                        <td className="text-end pe-3">
                          <div className="d-inline-flex gap-1.5">
                            <Link to={`/study/${scan._id}`} className="rad-btn-outline btn-sm py-1 px-2.5 extra-small">
                              <i className="fas fa-eye me-1"></i> PACS
                            </Link>
                            <button
                              onClick={() => handleDelete(scan._id, filename)}
                              disabled={deleteMutation.isLoading}
                              className="rad-btn-danger btn-sm py-1 px-2 extra-small"
                              title="Delete Study"
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="7" className="text-center py-5 text-muted">
                      No matching studies found in Chest X-Ray worklist.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Pagination Controls */}
      {pagination.totalPages > 1 && (
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
          <small className="text-secondary font-monospace extra-small">
            Showing {results.length} of {pagination.total} total indexed studies
          </small>
          <div className="d-flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(prev => Math.max(prev - 1, 1))}
              className="rad-btn-outline btn-sm px-3"
            >
              &larr; Previous
            </button>
            <span className="badge bg-dark border border-secondary text-cyan d-flex align-items-center px-3 font-monospace">
              {page} / {pagination.totalPages}
            </span>
            <button
              disabled={page >= pagination.totalPages}
              onClick={() => setPage(prev => Math.min(prev + 1, pagination.totalPages))}
              className="rad-btn-outline btn-sm px-3"
            >
              Next &rarr;
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorklistHistory;
