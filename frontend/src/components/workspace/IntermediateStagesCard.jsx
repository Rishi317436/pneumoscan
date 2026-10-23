import React, { useState } from 'react';
import { getImageUrl } from '../../services/api';

const IntermediateStagesCard = ({ intermediateStages, onSelectStage }) => {
  const [selectedModal, setSelectedModal] = useState(null);

  if (!intermediateStages) return null;

  const stages = [
    {
      id: 'clahe',
      title: 'CLAHE Enhanced',
      badge: 'Stage 6',
      badgeClass: 'bg-primary',
      description: 'Contrast Limited Adaptive Histogram Equalization optimizing lung field contrast.',
      url: intermediateStages.clahe ? getImageUrl(intermediateStages.clahe) : null
    },
    {
      id: 'lung_mask',
      title: 'Thoracic Lung Extraction',
      badge: 'Stage 8',
      badgeClass: 'bg-info text-dark',
      description: 'Anatomical segmentation isolating pulmonary parenchyma from thoracic walls.',
      url: intermediateStages.lung_mask ? getImageUrl(intermediateStages.lung_mask) : null
    },
    {
      id: 'six_zones',
      title: '6-Zone Partition',
      badge: 'Stage 9',
      badgeClass: 'bg-success',
      description: 'Exact anatomical 6-zone subdivision (Upper, Middle, Lower hemithorax tiers).',
      url: intermediateStages.six_zones ? getImageUrl(intermediateStages.six_zones) : null
    }
  ].filter(s => !!s.url);

  if (stages.length === 0) return null;

  return (
    <div className="rad-card p-4 mt-4">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <div className="d-flex align-items-center gap-2">
          <i className="fas fa-layer-group text-cyan" style={{ color: 'var(--rad-cyan)' }}></i>
          <h6 className="fw-bold text-white mb-0">DIP Image Processing Stages</h6>
        </div>
        <span className="badge bg-secondary-subtle text-secondary extra-small">
          Stages ({stages.length}/3)
        </span>
      </div>
      <p className="text-secondary extra-small mb-3">
        Inspect thoracic preprocessing and anatomical lung field segmentation stages. Click any thumbnail to expand.
      </p>

      <div className="row g-3">
        {stages.map((stage) => (
          <div key={stage.id} className="col-12 col-md-4">
            <div
              className="p-2 rounded bg-dark border border-secondary border-opacity-25 h-100 d-flex flex-column cursor-pointer hover-card"
              onClick={() => setSelectedModal(stage)}
              style={{ transition: 'transform 0.2s, border-color 0.2s' }}
            >
              <div className="d-flex justify-content-between align-items-center mb-1.5">
                <span className={`badge ${stage.badgeClass} extra-small`}>{stage.badge}</span>
                <span className="text-muted extra-small font-monospace" style={{ fontSize: '0.65rem' }}>
                  <i className="fas fa-search-plus"></i>
                </span>
              </div>
              <div
                className="overflow-hidden rounded mb-2 bg-black d-flex align-items-center justify-content-center"
                style={{ height: '95px' }}
              >
                <img
                  src={stage.url}
                  alt={stage.title}
                  className="img-fluid"
                  style={{ maxHeight: '95px', objectFit: 'contain' }}
                />
              </div>
              <strong className="text-white extra-small d-block mb-1 text-truncate">{stage.title}</strong>
              <span className="text-secondary" style={{ fontSize: '0.7rem', lineHeight: '1.2' }}>
                {stage.description}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox Modal for Full View Inspection */}
      {selectedModal && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1050 }}
          onClick={() => setSelectedModal(null)}
        >
          <div className="modal-dialog modal-dialog-centered modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content bg-dark border border-secondary text-white">
              <div className="modal-header border-secondary border-opacity-25 py-2.5 px-3">
                <div className="d-flex align-items-center gap-2">
                  <span className={`badge ${selectedModal.badgeClass} extra-small`}>{selectedModal.badge}</span>
                  <h6 className="modal-title fw-bold text-white mb-0">{selectedModal.title}</h6>
                </div>
                <button
                  type="button"
                  className="btn-close btn-close-white btn-sm"
                  onClick={() => setSelectedModal(null)}
                ></button>
              </div>
              <div className="modal-body p-3 text-center bg-black">
                <img
                  src={selectedModal.url}
                  alt={selectedModal.title}
                  className="img-fluid rounded"
                  style={{ maxHeight: '550px', objectFit: 'contain' }}
                />
                <p className="text-secondary extra-small mt-3 mb-0">
                  {selectedModal.description}
                </p>
              </div>
              <div className="modal-footer border-secondary border-opacity-25 py-2 px-3 d-flex justify-content-between">
                <span className="text-muted extra-small font-monospace">PACS Intermediate Artifact</span>
                <button className="btn btn-sm btn-secondary" onClick={() => setSelectedModal(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IntermediateStagesCard;
