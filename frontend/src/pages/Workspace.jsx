import React, { useState, useRef, useEffect } from 'react';
import InteractiveXrayViewer from '../components/workspace/InteractiveXrayViewer';
import PredictionProgressTracker from '../components/workspace/PredictionProgressTracker';
import AIConfidenceGauge from '../components/workspace/AIConfidenceGauge';
import DualMethodComparisonCard from '../components/workspace/DualMethodComparisonCard';
import IntermediateStagesCard from '../components/workspace/IntermediateStagesCard';
import { useUploadScan } from '../hooks/useScans';
import { useToast } from '../context/ToastContext';
import RadiologyDashboard from './RadiologyDashboard';
import WorklistHistory from './WorklistHistory';
import ClinicalFeedback from './ClinicalFeedback';

const Workspace = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [fileSizeMB, setFileSizeMB] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [activeDetection, setActiveDetection] = useState(null);

  const fileInputRef = useRef(null);
  const { addToast } = useToast();
  const uploadMutation = useUploadScan();
  const isProcessing = Boolean(uploadMutation.isPending || uploadMutation.isLoading);

  const handleFile = (file) => {
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      setFileSizeMB((file.size / (1024 * 1024)).toFixed(2));
      const reader = new FileReader();
      reader.onload = (e) => setPreviewUrl(e.target.result);
      reader.readAsDataURL(file);
    } else {
      addToast('Please select a valid Chest X-Ray image (JPEG, PNG).', 'error');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    setPreviewUrl('');
    setFileSizeMB('');
    setActiveDetection(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRunInference = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      addToast('Please mount a Chest X-Ray to analyze.', 'warning');
      return;
    }

    const formData = new FormData();
    formData.append('xrayImage', selectedFile);

    try {
      const res = await uploadMutation.mutateAsync(formData);
      if (res.success && res.detection) {
        setActiveDetection(res.detection);
        addToast('Chest X-Ray analysis and 6-zone segmentation complete!', 'success');
      } else {
        addToast(res.message || 'Processing failed.', 'error');
      }
    } catch (err) {
      console.error('Inference error:', err);
      addToast(err.response?.data?.message || 'Error occurred during Chest X-Ray analysis.', 'error');
    }
  };

  useEffect(() => {
    if (window.location.hash) {
      const id = window.location.hash.replace('#', '');
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      }, 300);
    }
  }, []);

  return (
    <div className="container-fluid py-4 px-lg-4">
      {/* Section 1: AI Chest X-Ray Workstation */}
      <section id="workstation" style={{ scrollMarginTop: '80px' }}>
        {/* Workspace Header */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h2 className="fw-extrabold text-white mb-1 d-flex align-items-center gap-2">
            <i className="fas fa-desktop text-cyan" style={{ color: 'var(--rad-cyan)' }}></i>
            <span>Chest X-Ray Workstation</span>
          </h2>
          <p className="text-secondary small mb-0">
            Real-time PACS analysis powered by DenseNet-121 Neural Networks, Grad-CAM Saliency, and Traditional DIP.
          </p>
        </div>

        {activeDetection && (
          <div className="d-flex gap-2">
            <button onClick={() => window.print()} className="glass-btn small">
              <i className="fas fa-print me-1.5"></i> Export Report
            </button>
            <button onClick={handleClear} className="glass-btn primary small">
              <i className="fas fa-plus me-1.5"></i> New Study
            </button>
          </div>
        )}
      </div>

      {/* Multi-Stage Inference Stepper Tracker */}
      <PredictionProgressTracker isProcessing={isProcessing} />

      {activeDetection ? (
        <div className="row g-4">
          {/* Active Study: Interactive Chest X-Ray Viewer & Intermediate Stages */}
          <div className="col-xl-7">
            <InteractiveXrayViewer
              originalImage={activeDetection.originalImage}
              gradcamImage={activeDetection.gradcamImage}
              zoneOverlayImage={activeDetection.manualDetection?.zoneOverlayImage}
              title="Active Study: Chest X-Ray"
              filename={activeDetection.scanId?.filename || selectedFile?.name || 'Patient_Scan.jpeg'}
            />
            <IntermediateStagesCard
              intermediateStages={activeDetection.manualDetection?.intermediate_stages}
            />
          </div>

          {/* Right Column: AI Confidence, Saliency Breakdown & Concordance */}
          <div className="col-xl-5 d-flex flex-column gap-4">
            <AIConfidenceGauge
              mlDetection={activeDetection.mlDetection}
              manualDetection={activeDetection.manualDetection}
              comparison={activeDetection.comparison}
            />
            <DualMethodComparisonCard
              manualDetection={activeDetection.manualDetection}
              mlDetection={activeDetection.mlDetection}
              comparison={activeDetection.comparison}
            />
          </div>
        </div>
      ) : (
        /* Full-Width Expanded Holographic Upload / Mount Dropzone Card */
        <div className="row justify-content-center">
          <div className="col-12 col-xl-10">
            <div className="rad-card p-4 p-md-5">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <span className="fw-bold text-white small text-uppercase" style={{ letterSpacing: '0.04em' }}>
                  <i className="fas fa-radiation me-2" style={{ color: 'var(--lightsaber-green, #39ff14)' }}></i>
                  Mount Chest X-Ray Study
                </span>
                <span className="badge bg-dark border border-secondary text-secondary extra-small font-monospace">AP / PA Chest X-Ray</span>
              </div>

              {/* Unique Holographic Scanner Dropzone (Expanded) */}
              <div
                className={`holo-scanner-dropzone mb-4 cursor-pointer ${isDragOver ? 'dragover' : ''}`}
                style={{ padding: '4rem 2rem' }}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  className="d-none"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleFile(e.target.files[0]);
                    }
                  }}
                />

                {/* Holographic Reticle Crosshairs */}
                <div className="scanner-crosshair top-left"></div>
                <div className="scanner-crosshair top-right"></div>
                <div className="scanner-crosshair bottom-left"></div>
                <div className="scanner-crosshair bottom-right"></div>
                <div className="scanner-laser-beam"></div>

                {/* Center Glowing Aperture Ring */}
                <div className="scanner-aperture-ring mx-auto mb-3" style={{ width: '84px', height: '84px' }}>
                  <i className="fas fa-lungs fa-2x" style={{ color: 'var(--lightsaber-green, #39ff14)' }}></i>
                </div>

                <h4 className="fw-bold text-white mb-2">Drop Chest X-Ray Here</h4>
                <p className="text-secondary mb-3" style={{ fontSize: '0.95rem' }}>or click to browse local PACS DICOM, PNG, or JPEG</p>

                <div className="d-flex justify-content-center gap-2 flex-wrap">
                  <span className="badge rounded-pill holo-badge px-3 py-2">DICOM 3.0</span>
                  <span className="badge rounded-pill holo-badge px-3 py-2">PNG / JPEG</span>
                  <span className="badge rounded-pill holo-badge px-3 py-2">High-Res PA / AP</span>
                </div>
              </div>

              {/* Selected Chest X-Ray Preview Pill */}
              {selectedFile && previewUrl && (
                <div className="p-3 rounded-3 glass-card mb-4 d-flex align-items-center justify-content-between" style={{ border: '1px solid rgba(57, 255, 20, 0.4)' }}>
                  <div className="d-flex align-items-center gap-3">
                    <img
                      src={previewUrl}
                      alt="Mount preview"
                      className="rounded"
                      style={{ width: '64px', height: '64px', objectFit: 'cover', border: '1px solid rgba(57, 255, 20, 0.5)' }}
                    />
                    <div>
                      <strong className="text-white d-block">{selectedFile.name}</strong>
                      <span className="badge extra-small font-monospace" style={{ background: 'rgba(57, 255, 20, 0.2)', color: 'var(--lightsaber-green, #39ff14)' }}>
                        {fileSizeMB} MB &bull; Mounted for Analysis
                      </span>
                    </div>
                  </div>
                  <button onClick={handleClear} className="glass-btn small" title="Remove Mounted Scan">
                    <i className="fas fa-times text-danger"></i>
                  </button>
                </div>
              )}

              {/* Action Inference Trigger Button */}
              <button
                onClick={handleRunInference}
                disabled={!selectedFile || isProcessing}
                className="glass-btn primary w-100 py-3 d-flex align-items-center justify-content-center gap-2"
                style={{ fontSize: '1.05rem', fontWeight: 700 }}
              >
                {isProcessing ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" style={{ color: 'var(--lightsaber-green, #39ff14)' }}></span>
                    <span>Analyzing Chest X-Ray Parenchyma...</span>
                  </>
                ) : (
                  <>
                    <i className="fas fa-play me-2" style={{ color: 'var(--lightsaber-green, #39ff14)' }}></i>
                    <span>Execute Chest X-Ray Analysis</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      </section>

      {/* Section 2: Analytics & Cohort Performance */}
      <hr className="my-5 border-secondary border-opacity-25" />
      <section id="analytics" style={{ scrollMarginTop: '80px' }}>
        <RadiologyDashboard />
      </section>

      {/* Section 3: Studies & Worklist History */}
      <hr className="my-5 border-secondary border-opacity-25" />
      <section id="studies" style={{ scrollMarginTop: '80px' }}>
        <WorklistHistory />
      </section>

      {/* Section 4: Clinical Feedback & Peer Review */}
      <hr className="my-5 border-secondary border-opacity-25" />
      <section id="feedback" style={{ scrollMarginTop: '80px' }}>
        <ClinicalFeedback />
      </section>
    </div>
  );
};

export default Workspace;
