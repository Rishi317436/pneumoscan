import React from 'react';
import { useParams, Link } from 'react-router-dom';
import InteractiveXrayViewer from '../components/workspace/InteractiveXrayViewer';
import AIConfidenceGauge from '../components/workspace/AIConfidenceGauge';
import DualMethodComparisonCard from '../components/workspace/DualMethodComparisonCard';
import { useScanDetail } from '../hooks/useScans';
import { SkeletonCard } from '../components/common/SkeletonLoader';
import { isDIPAdjudicated } from '../utils/adjudication';

const StudyDetail = () => {
  const { id } = useParams();
  const { data, isLoading, isError } = useScanDetail(id);

  const detection = data?.detection;

  if (isLoading) {
    return (
      <div className="container-fluid py-5 px-lg-4">
        <div className="row g-4">
          <div className="col-lg-7"><SkeletonCard height="400px" /></div>
          <div className="col-lg-5"><SkeletonCard height="400px" /></div>
        </div>
      </div>
    );
  }

  if (isError || !detection) {
    return (
      <div className="container py-5 text-center">
        <div className="rad-card p-5 max-w-md mx-auto">
          <i className="fas fa-exclamation-triangle text-danger fs-1 mb-3"></i>
          <h4 className="fw-bold text-white mb-2">Chest X-Ray Study Not Found</h4>
          <p className="text-secondary small mb-4">The study UID may have been deleted or moved from storage.</p>
          <Link to="/worklist" className="glass-btn primary small">Return to Worklist</Link>
        </div>
      </div>
    );
  }

  const filename = detection.scanId?.filename || (detection.originalImage ? detection.originalImage.split(/[\\/]/).pop() : 'Study.jpeg');
  const clinical = detection.clinicalInformation || {};

  return (
    <div className="container-fluid py-4 px-lg-4 pacs-study-detail-page">
      {/* Print-Only Diagnostic Header */}
      <div className="d-none d-print-block mb-3 pb-2 border-bottom border-2 border-dark">
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h4 className="fw-bold mb-0 text-dark">PneumoScan &bull; Diagnostic Study Report</h4>
            <small className="text-secondary">Multi-Method Chest X-Ray Diagnostic Verification</small>
          </div>
          <div className="text-end font-monospace">
            <span className="fw-bold text-dark d-block">STUDY: {filename}</span>
            <small className="text-muted">ID: {detection._id} | {new Date(detection.createdAt).toLocaleDateString()}</small>
          </div>
        </div>
      </div>

      {/* Header Bar */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div className="d-flex align-items-center gap-3">
          <Link to="/worklist" className="rad-btn-outline btn-sm py-1.5 px-2.5 d-print-none">
            <i className="fas fa-arrow-left"></i>
          </Link>
          <div>
            <h3 className="fw-extrabold text-white mb-0 d-flex align-items-center gap-2">
              <i className="fas fa-file-medical text-cyan" style={{ color: 'var(--rad-cyan)' }}></i>
              <span>Diagnostic Study: {filename}</span>
            </h3>
            <span className="text-secondary extra-small font-monospace">
              STUDY ID: {detection._id} | INGESTED: {new Date(detection.createdAt).toLocaleString()}
            </span>
          </div>
        </div>

        <div className="d-flex gap-2 d-print-none">
          <button onClick={() => window.print()} className="rad-btn-outline btn-sm">
            <i className="fas fa-print me-1.5"></i> Print Study Report
          </button>
          <Link to="/workspace" className="rad-btn-primary btn-sm">
            <i className="fas fa-plus me-1.5"></i> Mount New Study
          </Link>
        </div>
      </div>

      <div className="row g-4 mb-4">
        {/* Left: Interactive PACS Canvas */}
        <div className="col-xl-7">
          <InteractiveXrayViewer
            originalImage={detection.originalImage}
            gradcamImage={detection.gradcamImage}
            zoneOverlayImage={detection.manualDetection?.zoneOverlayImage}
            title="Chest X-Ray & Attention Overlay"
            filename={filename}
          />
        </div>

        {/* Right: Confidence Gauge & Concordance Analysis */}
        <div className="col-xl-5 d-flex flex-column gap-4">
          <AIConfidenceGauge
            mlDetection={detection.mlDetection}
            manualDetection={detection.manualDetection}
            comparison={detection.comparison}
          />

          <DualMethodComparisonCard
            manualDetection={detection.manualDetection}
            mlDetection={detection.mlDetection}
            comparison={detection.comparison}
          />
        </div>
      </div>

      {/* Clinical Notes (If any) */}
      {(clinical.symptoms || clinical.recentHospitalization || clinical.mechanicalVentilation || clinical.aspirationHistory || clinical.otherInfo) && (
        <div className="rad-card p-4 mb-4">
          <h6 className="fw-bold text-white small text-uppercase mb-3" style={{ letterSpacing: '0.04em' }}>
            <i className="fas fa-notes-medical me-2 text-cyan" style={{ color: 'var(--rad-cyan)' }}></i>
            Ingested Clinical Presentation
          </h6>
          <div className="row g-3">
            <div className="col-md-6">
              <small className="text-muted extra-small d-block fw-bold">Reported Symptoms</small>
              <p className="text-secondary small mb-2">{clinical.symptoms || 'None recorded'}</p>
              {clinical.otherInfo && (
                <>
                  <small className="text-muted extra-small d-block fw-bold">Additional Notes</small>
                  <p className="text-secondary small mb-0">{clinical.otherInfo}</p>
                </>
              )}
            </div>
            <div className="col-md-6">
              <small className="text-muted extra-small d-block fw-bold mb-2">Hospitalization & Risk Factors</small>
              <div className="d-flex flex-wrap gap-2">
                {clinical.recentHospitalization && (
                  <span className="badge bg-warning text-dark">Recent Hospitalization</span>
                )}
                {clinical.timeSinceAdmission && clinical.timeSinceAdmission !== 'N/A' && (
                  <span className="badge bg-info text-dark">Admission: {clinical.timeSinceAdmission}</span>
                )}
                {clinical.mechanicalVentilation && (
                  <span className="badge bg-danger">Mechanical Ventilation (VAP)</span>
                )}
                {clinical.aspirationHistory && (
                  <span className="badge bg-danger">Aspiration Risk</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default StudyDetail;
