import React from 'react';

const SampleScansModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const samples = [
    {
      type: 'PNEUMONIA',
      badge: 'Pneumonia Verified',
      badgeClass: 'rad-badge-pneumonia',
      title: 'Sample 1: Pneumonia Radiograph',
      filename: 'sample_pneumonia_1.jpeg',
      url: '/sample_scans/sample_pneumonia_1.jpeg',
      description: 'Marked consolidation and opacity pattern.'
    },
    {
      type: 'PNEUMONIA',
      badge: 'Pneumonia Verified',
      badgeClass: 'rad-badge-pneumonia',
      title: 'Sample 2: Pneumonia Radiograph',
      filename: 'sample_pneumonia_2.jpeg',
      url: '/sample_scans/sample_pneumonia_2.jpeg',
      description: 'Extensive bronchovascular infiltrate & opacity.'
    },
    {
      type: 'NORMAL',
      badge: 'Normal Control',
      badgeClass: 'rad-badge-normal',
      title: 'Sample 3: Normal Chest Radiograph',
      filename: 'sample_normal_1.jpeg',
      url: '/sample_scans/sample_normal_1.jpeg',
      description: 'Clear lung fields with symmetric radiolucency.'
    },
    {
      type: 'NORMAL',
      badge: 'Normal Control',
      badgeClass: 'rad-badge-normal',
      title: 'Sample 4: Normal Chest Radiograph',
      filename: 'sample_normal_2.jpeg',
      url: '/sample_scans/sample_normal_2.jpeg',
      description: 'Unremarkable pulmonary parenchyma, normal cardiac silhouette.'
    }
  ];

  return (
    <div
      className="modal fade show d-block"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.85)', zIndex: 1060 }}
      onClick={onClose}
    >
      <div
        className="modal-dialog modal-dialog-centered modal-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-content bg-dark border border-secondary text-white shadow-lg" style={{ borderRadius: '14px' }}>
          {/* Header */}
          <div className="modal-header border-secondary border-opacity-25 py-3 px-4 d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center gap-2.5">
              <div
                className="d-flex align-items-center justify-content-center rounded-circle"
                style={{ width: '38px', height: '38px', backgroundColor: 'rgba(57, 255, 20, 0.15)', color: 'var(--rad-cyan, #39ff14)' }}
              >
                <i className="fas fa-download fs-5"></i>
              </div>
              <div>
                <h5 className="modal-title fw-bold text-white mb-0">Download Sample Chest X-Rays</h5>
                <small className="text-secondary extra-small">
                  Pre-verified benchmark radiographs for testing PneumoScan detection pipelines
                </small>
              </div>
            </div>
            <button
              type="button"
              className="btn-close btn-close-white"
              onClick={onClose}
              aria-label="Close"
            ></button>
          </div>

          {/* Body */}
          <div className="modal-body p-4">
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3 p-3 rounded bg-surface border border-secondary border-opacity-25">
              <div>
                <strong className="text-white small d-block">Full Sample Testing Bundle (.zip)</strong>
                <span className="text-secondary extra-small">Contains all 4 sample radiographs (2 Pneumonia + 2 Normal)</span>
              </div>
              <a
                href="/sample_scans/sample_chest_xrays.zip"
                download="sample_chest_xrays.zip"
                className="rad-btn-primary btn-sm py-1.5 px-3 extra-small d-inline-flex align-items-center gap-1.5"
              >
                <i className="fas fa-file-archive"></i> Download All (.ZIP)
              </a>
            </div>

            <h6 className="fw-bold text-muted extra-small text-uppercase mb-3" style={{ letterSpacing: '0.05em' }}>
              <i className="fas fa-images me-1 text-cyan" style={{ color: 'var(--rad-cyan, #39ff14)' }}></i> Individual Sample Radiographs
            </h6>

            <div className="row g-3">
              {samples.map((sample, idx) => (
                <div key={idx} className="col-12 col-md-6">
                  <div className="p-3 rounded bg-dark border border-secondary border-opacity-25 h-100 d-flex flex-column justify-content-between">
                    <div>
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span className={`badge ${sample.badgeClass} extra-small`}>{sample.badge}</span>
                        <span className="font-monospace text-muted extra-small">{sample.filename}</span>
                      </div>

                      <div
                        className="rounded mb-2 bg-black overflow-hidden d-flex align-items-center justify-content-center border border-secondary border-opacity-25"
                        style={{ height: '140px' }}
                      >
                        <img
                          src={sample.url}
                          alt={sample.title}
                          className="img-fluid"
                          style={{ maxHeight: '140px', objectFit: 'contain' }}
                          loading="lazy"
                        />
                      </div>

                      <strong className="text-white small d-block mb-1">{sample.title}</strong>
                      <p className="text-secondary extra-small mb-3" style={{ fontSize: '0.72rem', lineHeight: '1.3' }}>
                        {sample.description}
                      </p>
                    </div>

                    <a
                      href={sample.url}
                      download={sample.filename}
                      className="rad-btn-outline btn-sm py-1.5 px-3 w-100 text-center extra-small d-inline-flex align-items-center justify-content-center gap-1.5"
                    >
                      <i className="fas fa-download"></i> Download {sample.filename}
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="modal-footer border-secondary border-opacity-25 py-2.5 px-4 d-flex justify-content-between">
            <small className="text-secondary extra-small">
              <i className="fas fa-info-circle me-1 text-cyan" style={{ color: 'var(--rad-cyan, #39ff14)' }}></i>
              Save any file to your computer, then mount it in the <strong>Workstation</strong> dropzone to run inference.
            </small>
            <button type="button" className="rad-btn-outline btn-sm py-1 px-3 extra-small" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SampleScansModal;
