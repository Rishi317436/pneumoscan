import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { scanAPI } from '../services/api';

const UploadScan = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [fileSizeMB, setFileSizeMB] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [clinicalData, setClinicalData] = useState({
    symptoms: '',
    recentHospitalization: false,
    timeSinceAdmission: 'N/A',
    mechanicalVentilation: false,
    aspirationHistory: false,
    otherInfo: ''
  });

  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const handleFile = (file) => {
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      setFileSizeMB((file.size / (1024 * 1024)).toFixed(2));
      const reader = new FileReader();
      reader.onload = (e) => setPreviewUrl(e.target.result);
      reader.readAsDataURL(file);
    } else {
      setErrorMsg('Please select a valid image file (JPEG, PNG, BMP, TIFF).');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setPreviewUrl('');
    setFileSizeMB('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClinicalChange = (e) => {
    const { name, value, type, checked } = e.target;
    setClinicalData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMsg('Please select an X-ray image to upload.');
      return;
    }

    setErrorMsg('');
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('xrayImage', selectedFile);
      formData.append('symptoms', clinicalData.symptoms);
      formData.append('recentHospitalization', clinicalData.recentHospitalization);
      formData.append('timeSinceAdmission', clinicalData.timeSinceAdmission);
      formData.append('mechanicalVentilation', clinicalData.mechanicalVentilation);
      formData.append('aspirationHistory', clinicalData.aspirationHistory);
      formData.append('otherInfo', clinicalData.otherInfo);

      const res = await scanAPI.uploadScan(formData);
      if (res.data.success && res.data.detectionId) {
        navigate(`/scan/detail/${res.data.detectionId}`);
      } else {
        setErrorMsg(res.data.message || 'Processing failed.');
      }
    } catch (err) {
      console.error('Upload error:', err);
      setErrorMsg(err.response?.data?.message || 'Error occurred while processing chest X-ray.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="container py-4">
      {errorMsg && (
        <div className="alert alert-danger alert-dismissible fade show shadow-sm border-0">
          <i className="fas fa-exclamation-triangle me-2"></i>
          {errorMsg}
          <button type="button" className="btn-close" onClick={() => setErrorMsg('')}></button>
        </div>
      )}

      <div className="row justify-content-center">
        <div className="col-md-9 col-lg-8 col-xl-7">
          <div className="card shadow-md border-0 mt-2 mb-4">
            <div className="card-header py-3 text-center">
              <h4 className="mb-0 fw-bold text-white d-flex align-items-center justify-content-center gap-2">
                <i className="fas fa-lungs" style={{ color: '#14b8a6' }}></i>
                <span>Upload Chest X-Ray & Analyze</span>
              </h4>
              <p className="text-light opacity-75 small mb-0 mt-1">
                Dual-method detection: Traditional DIP + Deep Learning (DenseNet121)
              </p>
            </div>

            <div className="card-body p-4 p-md-5">
              <form onSubmit={handleSubmit}>
                {/* File Dropzone */}
                <div className="mb-4">
                  <label className="form-label fw-bold text-secondary d-flex justify-content-between align-items-center">
                    <span>Patient Chest X-Ray Image <span className="text-danger">*</span></span>
                    <span className="extra-small text-muted" style={{ fontSize: '0.8rem' }}>
                      Formats: JPEG, PNG, JPG (PA/AP view)
                    </span>
                  </label>

                  <div
                    className={`dropzone-box p-4 p-md-5 text-center cursor-pointer position-relative ${isDragOver ? 'dragover' : ''}`}
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
                    <div className="py-2">
                      <div
                        className="stat-icon-wrapper bg-teal-subtle text-teal mx-auto mb-3"
                        style={{
                          width: '64px',
                          height: '64px',
                          backgroundColor: 'rgba(20, 184, 166, 0.12)',
                          color: '#14b8a6',
                          fontSize: '1.8rem'
                        }}
                      >
                        <i className="fas fa-cloud-upload-alt"></i>
                      </div>
                      <h5 className="fw-bold text-dark mb-1">Drag & Drop Chest X-Ray image here</h5>
                      <p className="text-muted small mb-0">or click to select file from your computer</p>
                    </div>
                  </div>
                </div>

                {/* Selected File Preview Area */}
                {selectedFile && previewUrl && (
                  <div className="mb-4">
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <span className="form-label fw-bold text-secondary mb-0">Selected Scan Preview</span>
                      <div>
                        <span className="badge bg-teal-subtle text-teal me-2">
                          <i className="fas fa-file-image me-1"></i>{selectedFile.name}
                        </span>
                        <span className="badge bg-secondary-subtle text-secondary">{fileSizeMB} MB</span>
                      </div>
                    </div>
                    <div className="position-relative text-center p-3 border rounded-3 bg-light">
                      <img
                        src={previewUrl}
                        alt="X-ray preview"
                        className="img-fluid rounded shadow-sm"
                        style={{ maxHeight: '280px', objectFit: 'contain' }}
                      />
                      <button
                        type="button"
                        className="btn btn-sm btn-danger position-absolute top-0 end-0 m-3 rounded-circle d-flex align-items-center justify-content-center"
                        style={{ width: '34px', height: '34px', padding: 0 }}
                        onClick={handleRemoveFile}
                        title="Remove file"
                      >
                        <i className="fas fa-times"></i>
                      </button>
                    </div>
                  </div>
                )}

                {/* Diagnostic Engine Notice */}
                <div className="alert alert-info border-0 rounded-3 shadow-sm mb-4 d-flex align-items-center gap-3">
                  <i className="fas fa-info-circle text-info fs-4"></i>
                  <div className="small">
                    <strong>Automated Multi-Method Analysis:</strong> Both <strong>Traditional Image Processing</strong> (feature extraction & thresholding) and <strong>Deep Learning CNN</strong> (DenseNet121 with Grad-CAM) will execute simultaneously for comparison.
                  </div>
                </div>

                {/* Clinical Context Collapsible Section */}
                <div className="accordion mb-4" id="clinicalAccordion">
                  <div className="accordion-item border rounded-3 overflow-hidden">
                    <h2 className="accordion-header">
                      <button
                        className="accordion-button collapsed py-2.5 px-3 bg-light fw-bold text-secondary small"
                        type="button"
                        data-bs-toggle="collapse"
                        data-bs-target="#clinicalCollapse"
                      >
                        <i className="fas fa-notes-medical me-2 text-teal" style={{ color: '#14b8a6' }}></i>
                        Optional Clinical Context / Acquisition Information
                      </button>
                    </h2>
                    <div id="clinicalCollapse" className="accordion-collapse collapse" data-bs-parent="#clinicalAccordion">
                      <div className="accordion-body p-3">
                        <div className="mb-3">
                          <label className="form-label extra-small fw-bold text-secondary">Reported Symptoms</label>
                          <textarea
                            name="symptoms"
                            value={clinicalData.symptoms}
                            onChange={handleClinicalChange}
                            className="form-control form-control-sm"
                            rows="2"
                            placeholder="e.g. Cough, high fever, dyspnea, pleuritic chest pain..."
                          />
                        </div>
                        <div className="row g-2 mb-3">
                          <div className="col-md-6">
                            <div className="form-check mt-1">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                name="recentHospitalization"
                                id="hospCheck"
                                checked={clinicalData.recentHospitalization}
                                onChange={handleClinicalChange}
                              />
                              <label className="form-check-label extra-small fw-semibold text-secondary" htmlFor="hospCheck">
                                Recent Hospitalization
                              </label>
                            </div>
                          </div>
                          <div className="col-md-6">
                            <label className="form-label extra-small fw-bold text-secondary mb-1">Time Since Admission</label>
                            <select
                              name="timeSinceAdmission"
                              value={clinicalData.timeSinceAdmission}
                              onChange={handleClinicalChange}
                              className="form-select form-select-sm"
                            >
                              <option value="N/A">N/A (Outpatient / Community)</option>
                              <option value="<48h">&lt; 48 hours</option>
                              <option value="48h-5d">48 hours - 5 days</option>
                              <option value=">5d">&gt; 5 days</option>
                            </select>
                          </div>
                        </div>
                        <div className="row g-2 mb-3">
                          <div className="col-md-6">
                            <div className="form-check">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                name="mechanicalVentilation"
                                id="ventCheck"
                                checked={clinicalData.mechanicalVentilation}
                                onChange={handleClinicalChange}
                              />
                              <label className="form-check-label extra-small fw-semibold text-secondary" htmlFor="ventCheck">
                                Mechanical Ventilation
                              </label>
                            </div>
                          </div>
                          <div className="col-md-6">
                            <div className="form-check">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                name="aspirationHistory"
                                id="aspCheck"
                                checked={clinicalData.aspirationHistory}
                                onChange={handleClinicalChange}
                              />
                              <label className="form-check-label extra-small fw-semibold text-secondary" htmlFor="aspCheck">
                                Aspiration History / Risk
                              </label>
                            </div>
                          </div>
                        </div>
                        <div>
                          <label className="form-label extra-small fw-bold text-secondary">Additional Notes</label>
                          <input
                            type="text"
                            name="otherInfo"
                            value={clinicalData.otherInfo}
                            onChange={handleClinicalChange}
                            className="form-control form-control-sm"
                            placeholder="Comorbidities, view projection, oxygen saturation..."
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isUploading || !selectedFile}
                  className="btn btn-primary btn-lg w-100 py-3 fw-bold d-flex align-items-center justify-content-center gap-2 shadow-md mb-3"
                >
                  {isUploading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      <span>Running Multi-Method Analysis...</span>
                    </>
                  ) : (
                    <>
                      <i className="fas fa-microscope"></i>
                      <span>Upload and Analyze Chest X-Ray</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadScan;
