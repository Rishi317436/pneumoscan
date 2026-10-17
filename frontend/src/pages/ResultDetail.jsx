import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { scanAPI, getImageUrl } from '../services/api';

const ResultDetail = () => {
  const { id } = useParams();
  const [detection, setDetection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const res = await scanAPI.getDetail(id);
      if (res.data.success && res.data.detection) {
        setDetection(res.data.detection);
      } else {
        setErrorMsg(res.data.message || 'Detection record not found.');
      }
    } catch (err) {
      console.error('Fetch detail error:', err);
      setErrorMsg('Failed to load detection report.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-teal" role="status" style={{ width: '3rem', height: '3rem' }}>
          <span className="visually-hidden">Loading report...</span>
        </div>
      </div>
    );
  }

  if (!detection) {
    return (
      <div className="container py-5">
        <div className="card shadow-sm border-0 text-center py-5">
          <div className="card-body">
            <i className="fas fa-search mb-3 text-muted" style={{ fontSize: '3rem' }}></i>
            <h5 className="fw-bold text-dark mb-1">Detection Record Not Found</h5>
            <p className="text-muted small mb-3">{errorMsg || 'The requested analysis details could not be located.'}</p>
            <Link to="/results" className="btn btn-primary btn-sm">Return to Scan History</Link>
          </div>
        </div>
      </div>
    );
  }

  const manual = detection.manualDetection || {};
  const ml = detection.mlDetection || {};
  const comp = detection.comparison || {};
  const clinical = detection.clinicalInformation || {};

  const mlConf = typeof ml.confidence === 'number'
    ? (ml.confidence <= 1 ? ml.confidence * 100 : ml.confidence)
    : 0;

  const manualScore = typeof manual.score === 'number' ? manual.score : 0;
  const scoreDiff = typeof comp.scoreDifference === 'number' ? (comp.scoreDifference * 100).toFixed(1) : '0.0';
  const combinedScore = typeof comp.experimentalCombinedScore === 'number' ? (comp.experimentalCombinedScore * 100).toFixed(1) : '0.0';

  const origImageUrl = getImageUrl(detection.originalImage);
  const gradcamImageUrl = detection.gradcamImage ? getImageUrl(detection.gradcamImage) : null;

  return (
    <div className="container py-4">
      {/* Header Bar */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1">
            <Link to="/results" className="btn btn-outline-secondary btn-sm py-0.5 px-2">
              <i className="fas fa-arrow-left me-1"></i>Back
            </Link>
            <h2 className="fw-extrabold text-dark mb-0 d-flex align-items-center gap-2">
              <i className="fas fa-file-medical-alt text-teal" style={{ color: '#14b8a6' }}></i>
              <span>Pneumonia Multi-Method Analysis Report</span>
            </h2>
          </div>
          <p className="text-muted small mb-0">
            Comprehensive evaluation comparing Traditional DIP vs Deep Learning with Grad-CAM visualization.
          </p>
        </div>
        <div className="d-flex gap-2">
          <button onClick={() => window.print()} className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-1.5">
            <i className="fas fa-print"></i> Print Report
          </button>
          <Link to="/upload" className="btn btn-primary btn-sm d-inline-flex align-items-center gap-1.5 shadow-sm">
            <i className="fas fa-plus"></i> New Analysis
          </Link>
        </div>
      </div>

      {/* Imagery Overview Card */}
      <div className="card shadow-md border-0 mb-4 overflow-hidden">
        <div className="card-header py-3 text-white d-flex align-items-center justify-content-between">
          <h5 className="mb-0 fw-bold d-flex align-items-center gap-2">
            <i className="fas fa-microscope" style={{ color: '#14b8a6' }}></i>
            <span>Diagnostic Imagery Overview</span>
          </h5>
          <span className="badge bg-teal-subtle text-teal border border-teal-subtle">
            <i className="fas fa-clock me-1"></i>
            {new Date(detection.createdAt || Date.now()).toLocaleDateString()}
          </span>
        </div>
        <div className="card-body p-4">
          <div className="row g-4 text-center justify-content-center">
            <div className="col-md-5">
              <div className="p-3 border rounded-3 bg-light h-100 d-flex flex-column align-items-center">
                <h6 className="fw-bold text-dark mb-2">
                  <i className="fas fa-image me-1 text-primary"></i> Patient Chest X-Ray
                </h6>
                {origImageUrl && (
                  <img
                    src={origImageUrl}
                    alt="Patient Chest X-Ray"
                    className="img-fluid rounded shadow-sm my-auto"
                    style={{ maxHeight: '260px', objectFit: 'contain' }}
                  />
                )}
                <small className="text-muted mt-2 extra-small">
                  {detection.scanId?.filename || 'Input Chest X-Ray'}
                </small>
              </div>
            </div>

            <div className="col-md-5">
              <div className="p-3 border rounded-3 bg-light h-100 d-flex flex-column align-items-center">
                <h6 className="fw-bold text-dark mb-2">
                  <i className="fas fa-fire-alt me-1 text-danger"></i> Grad-CAM Attention Overlay
                </h6>
                {gradcamImageUrl ? (
                  <>
                    <img
                      src={gradcamImageUrl}
                      alt="Grad-CAM Overlay"
                      className="img-fluid rounded shadow-sm my-auto"
                      style={{ maxHeight: '260px', objectFit: 'contain' }}
                    />
                    <small className="text-muted mt-2 extra-small">
                      Heatmap highlighting neural network focus areas
                    </small>
                  </>
                ) : (
                  <div className="my-auto py-5 text-muted">
                    <i className="fas fa-eye-slash fs-2 mb-2"></i>
                    <p className="mb-0 extra-small">Grad-CAM visualization generated during model inference</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3-Column Comparative Grid */}
      <div className="row g-4 mb-4">
        {/* Section 1: Traditional DIP */}
        <div className="col-lg-4">
          <div className="card h-100 shadow-sm border-0">
            <div className="card-header py-3 bg-dark text-white">
              <h6 className="mb-0 fw-bold d-flex align-items-center justify-content-between">
                <span>
                  <i className="fas fa-cogs me-1 text-teal" style={{ color: '#14b8a6' }}></i> Method 1: Traditional DIP
                </span>
                <span className="badge bg-secondary extra-small">Heuristic/GLCM</span>
              </h6>
            </div>
            <div className="card-body p-3.5 d-flex flex-column">
              <div className="text-center mb-3 p-3 bg-light rounded-3">
                <span className="text-secondary extra-small text-uppercase fw-bold d-block mb-1">Traditional Prediction</span>
                {manual.prediction === 'PNEUMONIA' ? (
                  <span className="badge bg-danger px-3 py-2 fs-6">
                    <i className="fas fa-exclamation-triangle me-1"></i> PNEUMONIA
                  </span>
                ) : manual.prediction === 'NORMAL' ? (
                  <span className="badge bg-success px-3 py-2 fs-6">
                    <i className="fas fa-check-circle me-1"></i> NORMAL
                  </span>
                ) : (
                  <span className="badge bg-secondary px-3 py-2 fs-6">N/A</span>
                )}

                <div className="mt-3 text-start">
                  <div className="d-flex justify-content-between extra-small fw-bold text-secondary mb-1">
                    <span>Opacity / Infiltration Score</span>
                    <span>{manualScore.toFixed(1)}%</span>
                  </div>
                  <div className="progress" style={{ height: '8px' }}>
                    <div
                      className={`progress-bar ${manual.prediction === 'PNEUMONIA' ? 'bg-danger' : 'bg-success'}`}
                      style={{ width: `${Math.min(manualScore, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              <h6 className="fw-bold text-dark extra-small text-uppercase mb-2">
                <i className="fas fa-list-ul me-1 text-teal"></i> Extracted DIP Features
              </h6>
              <div className="table-responsive border rounded-2 mb-3">
                <table className="table table-sm table-striped mb-0 extra-small">
                  <tbody>
                    {manual.features ? (
                      <>
                        <tr>
                          <td className="text-secondary">Mean Intensity</td>
                          <td className="text-end fw-bold">
                            {typeof manual.features.mean_intensity === 'number'
                              ? manual.features.mean_intensity.toFixed(2)
                              : manual.features.mean_intensity || '-'}
                          </td>
                        </tr>
                        <tr>
                          <td className="text-secondary">Standard Dev</td>
                          <td className="text-end fw-bold">
                            {typeof manual.features.std_dev === 'number'
                              ? manual.features.std_dev.toFixed(2)
                              : manual.features.std_dev || '-'}
                          </td>
                        </tr>
                        <tr>
                          <td className="text-secondary">Entropy</td>
                          <td className="text-end fw-bold">
                            {typeof manual.features.entropy === 'number'
                              ? manual.features.entropy.toFixed(3)
                              : manual.features.entropy || '-'}
                          </td>
                        </tr>
                        <tr>
                          <td className="text-secondary">Edge Density</td>
                          <td className="text-end fw-bold">
                            {typeof manual.features.edge_density === 'number'
                              ? `${(manual.features.edge_density * 100).toFixed(2)}%`
                              : manual.features.edge_density || '-'}
                          </td>
                        </tr>
                        <tr>
                          <td className="text-secondary">LBP Mean</td>
                          <td className="text-end fw-bold">
                            {typeof manual.features.lbp_mean === 'number'
                              ? manual.features.lbp_mean.toFixed(2)
                              : manual.features.lbp_mean || '-'}
                          </td>
                        </tr>
                        <tr>
                          <td className="text-secondary">GLCM Contrast</td>
                          <td className="text-end fw-bold">
                            {typeof manual.features.glcm_contrast === 'number'
                              ? manual.features.glcm_contrast.toFixed(2)
                              : manual.features.glcm_contrast || '-'}
                          </td>
                        </tr>
                        <tr>
                          <td className="text-secondary">GLCM Homogeneity</td>
                          <td className="text-end fw-bold">
                            {typeof manual.features.glcm_homogeneity === 'number'
                              ? manual.features.glcm_homogeneity.toFixed(3)
                              : manual.features.glcm_homogeneity || '-'}
                          </td>
                        </tr>
                        <tr>
                          <td className="text-secondary">Uniformity</td>
                          <td className="text-end fw-bold">
                            {typeof manual.features.uniformity === 'number'
                              ? manual.features.uniformity.toFixed(4)
                              : manual.features.uniformity || '-'}
                          </td>
                        </tr>
                      </>
                    ) : (
                      <tr>
                        <td colSpan="2" className="text-center text-muted py-2">No feature metrics recorded</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {manual.decisionExplanation && (
                <div className="p-2.5 bg-light border rounded-2 mb-2 extra-small text-secondary fst-italic">
                  <strong>Decision Logic:</strong> {manual.decisionExplanation}
                </div>
              )}
              <p className="extra-small text-muted mt-auto mb-0">
                <i className="fas fa-info-circle me-1"></i>Experimental image-processing baseline based on calibrated training set thresholds.
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: Deep Learning CNN */}
        <div className="col-lg-4">
          <div className="card h-100 shadow-sm border-0">
            <div className="card-header py-3 bg-dark text-white">
              <h6 className="mb-0 fw-bold d-flex align-items-center justify-content-between">
                <span>
                  <i className="fas fa-robot me-1 text-teal" style={{ color: '#14b8a6' }}></i> Method 2: Machine Learning
                </span>
                <span className="badge bg-teal-subtle text-teal border border-teal-subtle extra-small">
                  DenseNet121
                </span>
              </h6>
            </div>
            <div className="card-body p-3.5 d-flex flex-column">
              <div className="text-center mb-3 p-3 bg-light rounded-3">
                <span className="text-secondary extra-small text-uppercase fw-bold d-block mb-1">Deep Learning Prediction</span>
                {ml.prediction === 'PNEUMONIA' ? (
                  <span className="badge bg-danger px-3 py-2 fs-6">
                    <i className="fas fa-robot me-1"></i> PNEUMONIA
                  </span>
                ) : ml.prediction === 'NORMAL' ? (
                  <span className="badge bg-success px-3 py-2 fs-6">
                    <i className="fas fa-check-circle me-1"></i> NORMAL
                  </span>
                ) : (
                  <span className="badge bg-secondary px-3 py-2 fs-6">N/A</span>
                )}

                <div className="mt-3 text-start">
                  <div className="d-flex justify-content-between extra-small fw-bold text-secondary mb-1">
                    <span>Model Confidence</span>
                    <span>{mlConf.toFixed(1)}%</span>
                  </div>
                  <div className="progress" style={{ height: '8px' }}>
                    <div
                      className={`progress-bar ${ml.prediction === 'PNEUMONIA' ? 'bg-danger' : 'bg-success'}`}
                      style={{ width: `${Math.min(mlConf, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="p-3 border rounded-3 bg-light mb-3">
                <h6 className="fw-bold text-dark extra-small text-uppercase mb-2">
                  <i className="fas fa-network-wired me-1 text-primary"></i> Neural Architecture Specs
                </h6>
                <ul className="list-unstyled extra-small mb-0 text-secondary d-flex flex-column gap-1.5">
                  <li><strong>Model Architecture:</strong> DenseNet-121 Transfer Learning</li>
                  <li><strong>Input Dimension:</strong> 224 &times; 224 RGB Normalized</li>
                  <li><strong>Model Version:</strong> {ml.modelVersion || 'v1.0'}</li>
                  <li><strong>Explainability:</strong> Grad-CAM Convolutional Activations</li>
                </ul>
              </div>

              <div className="p-2.5 bg-teal-subtle text-teal border border-teal-subtle rounded-2 mt-auto extra-small">
                <i className="fas fa-bullseye me-1"></i> <strong>Attention Map Note:</strong> Grad-CAM highlights specific Chest X-Ray regions driving the CNN classification decision.
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Comparison & Agreement */}
        <div className="col-lg-4">
          <div className="card h-100 shadow-sm border-0">
            <div className="card-header py-3 bg-dark text-white">
              <h6 className="mb-0 fw-bold d-flex align-items-center justify-content-between">
                <span>
                  <i className="fas fa-balance-scale me-1 text-teal" style={{ color: '#14b8a6' }}></i> Method Comparison
                </span>
                <span className="badge bg-primary extra-small">Multi-Analysis</span>
              </h6>
            </div>
            <div className="card-body p-3.5 d-flex flex-column">
              <div className="text-center mb-3 p-3 bg-light rounded-3">
                <span className="text-secondary extra-small text-uppercase fw-bold d-block mb-1">Agreement Status</span>
                {comp.agreementStatus === 'AGREE' ? (
                  <>
                    <div className="badge bg-success text-white px-3 py-2 fs-6 mb-1">
                      <i className="fas fa-check-circle me-1"></i> METHODS AGREE
                    </div>
                    <p className="extra-small text-success mb-0 mt-1">
                      Both traditional and ML methods arrived at the same diagnostic conclusion.
                    </p>
                  </>
                ) : comp.agreementStatus === 'DISAGREE' ? (
                  <>
                    <div className="badge bg-warning text-dark px-3 py-2 fs-6 mb-1">
                      <i className="fas fa-exclamation-triangle me-1"></i> METHODS DISAGREE
                    </div>
                    <p className="extra-small text-secondary mb-0 mt-1">
                      The methods produced different results. Additional clinical review may be required.
                    </p>
                  </>
                ) : (
                  <span className="badge bg-secondary px-3 py-2 fs-6">Pending Comparison</span>
                )}
              </div>

              <div className="table-responsive border rounded-2 mb-3">
                <table className="table table-sm table-bordered text-center align-middle mb-0 extra-small">
                  <thead className="table-light">
                    <tr>
                      <th className="text-start ps-2">Method</th>
                      <th>Result</th>
                      <th>Confidence/Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="text-start ps-2 fw-semibold">Traditional DIP</td>
                      <td>
                        {manual.prediction === 'PNEUMONIA' ? (
                          <span className="badge bg-danger-subtle text-danger">Pneumonia</span>
                        ) : (
                          <span className="badge bg-success-subtle text-success">Normal</span>
                        )}
                      </td>
                      <td>{manualScore.toFixed(1)}%</td>
                    </tr>
                    <tr>
                      <td className="text-start ps-2 fw-semibold">DenseNet121</td>
                      <td>
                        {ml.prediction === 'PNEUMONIA' ? (
                          <span className="badge bg-danger-subtle text-danger">Pneumonia</span>
                        ) : (
                          <span className="badge bg-success-subtle text-success">Normal</span>
                        )}
                      </td>
                      <td>{mlConf.toFixed(1)}%</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="p-3 border rounded-3 bg-light mb-3">
                <div className="d-flex justify-content-between align-items-center mb-2 extra-small">
                  <span className="text-secondary fw-semibold">Score Difference:</span>
                  <span className="fw-bold text-dark">{scoreDiff}%</span>
                </div>
                <div className="d-flex justify-content-between align-items-center extra-small">
                  <span className="text-secondary fw-semibold" title="Formula: 0.3 * Manual + 0.7 * ML">
                    Combined Research Score:
                  </span>
                  <span className="badge bg-teal text-white fw-bold" style={{ backgroundColor: '#0d9488' }}>
                    {combinedScore}%
                  </span>
                </div>
              </div>

              <p className="extra-small text-muted mt-auto mb-0">
                <i className="fas fa-atom me-1"></i>Combined score is an experimental weighted research index combining spatial feature analysis and neural probability.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Clinical Information (If provided) */}
      {(clinical.symptoms || clinical.recentHospitalization || (clinical.timeSinceAdmission && clinical.timeSinceAdmission !== 'N/A') || clinical.mechanicalVentilation || clinical.aspirationHistory || clinical.otherInfo) && (
        <div className="card shadow-sm border-0 mb-4 overflow-hidden">
          <div className="card-header py-3 bg-secondary text-white">
            <h6 className="mb-0 fw-bold">
              <i className="fas fa-notes-medical me-2"></i>Recorded Clinical Context
            </h6>
          </div>
          <div className="card-body p-4">
            <div className="row g-3">
              <div className="col-md-6">
                <h6 className="fw-bold text-dark small mb-1">Symptoms & Clinical Presentation</h6>
                <p className="text-secondary small mb-2">{clinical.symptoms || 'None recorded'}</p>
                {clinical.otherInfo && (
                  <>
                    <h6 className="fw-bold text-dark small mb-1">Additional Notes</h6>
                    <p className="text-secondary small mb-0">{clinical.otherInfo}</p>
                  </>
                )}
              </div>
              <div className="col-md-6">
                <h6 className="fw-bold text-dark small mb-2">Hospitalization & Risk Factors</h6>
                <div className="d-flex flex-wrap gap-2">
                  {clinical.recentHospitalization && (
                    <span className="badge bg-warning text-dark">
                      <i className="fas fa-hospital me-1"></i> Recent Hospitalization
                    </span>
                  )}
                  {clinical.timeSinceAdmission && clinical.timeSinceAdmission !== 'N/A' && (
                    <span className="badge bg-info text-dark">
                      Admission: {clinical.timeSinceAdmission}
                    </span>
                  )}
                  {clinical.mechanicalVentilation && (
                    <span className="badge bg-danger">
                      <i className="fas fa-lungs me-1"></i> Mechanical Ventilation
                    </span>
                  )}
                  {clinical.aspirationHistory && (
                    <span className="badge bg-danger">
                      <i className="fas fa-procedures me-1"></i> Aspiration Risk/History
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ResultDetail;
