import React, { useState, useRef } from 'react';
import { getImageUrl } from '../../services/api';

const InteractiveXrayViewer = ({
  originalImage,
  gradcamImage,
  zoneOverlayImage,
  title = 'Patient Chest X-Ray',
  filename = 'PA/AP Chest Study'
}) => {
  const [zoom, setZoom] = useState(1);
  const [invert, setInvert] = useState(false);
  const [contrast, setContrast] = useState(100);
  const [brightness, setBrightness] = useState(100);
  const [overlayOpacity, setOverlayOpacity] = useState(70);
  
  // Overlay Mode: 'gradcam' | 'zones' | 'none'
  const [overlayMode, setOverlayMode] = useState(
    zoneOverlayImage ? 'zones' : gradcamImage ? 'gradcam' : 'none'
  );
  
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const containerRef = useRef(null);

  const origUrl = getImageUrl(originalImage);
  const gradcamUrl = gradcamImage ? getImageUrl(gradcamImage) : null;
  const zoneOverlayUrl = zoneOverlayImage ? getImageUrl(zoneOverlayImage) : null;

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.75));
  const handleReset = () => {
    setZoom(1);
    setInvert(false);
    setContrast(100);
    setBrightness(100);
    setPan({ x: 0, y: 0 });
    setOverlayOpacity(70);
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Mobile Touchscreen Pan Support
  const handleTouchStart = (e) => {
    if (e.touches && e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({ x: touch.clientX - pan.x, y: touch.clientY - pan.y });
    }
  };

  const handleTouchMove = (e) => {
    if (!isDragging || !e.touches || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setPan({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y
    });
  };

  const handleTouchEnd = () => setIsDragging(false);

  const filterStyle = `contrast(${contrast}%) brightness(${brightness}%) ${invert ? 'invert(100%) hue-rotate(180deg)' : ''}`;

  return (
    <div className="rad-card overflow-hidden">
      {/* PACS Viewer Header Toolbar */}
      <div className="rad-card-header flex-wrap gap-2 d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center gap-2">
          <i className="fas fa-x-ray" style={{ color: 'var(--rad-cyan)' }}></i>
          <div>
            <h6 className="fw-bold text-white mb-0 small">{title}</h6>
            <span className="text-secondary extra-small font-monospace">{filename}</span>
          </div>
        </div>

        {/* View Mode Switcher Pills */}
        <div className="d-flex align-items-center gap-1.5 flex-wrap d-print-none" role="group">
          <button
            type="button"
            className={`glass-btn small ${overlayMode === 'none' ? 'active primary' : ''}`}
            onClick={() => setOverlayMode('none')}
          >
            Chest X-Ray Only
          </button>
          {zoneOverlayUrl && (
            <button
              type="button"
              className={`glass-btn small ${overlayMode === 'zones' ? 'active primary' : ''}`}
              onClick={() => setOverlayMode('zones')}
              title="6-Zone Anatomical Segmentation"
            >
              <i className="fas fa-th-large me-1"></i> 6-Zone DIP Map
            </button>
          )}
          {gradcamUrl && (
            <button
              type="button"
              className={`glass-btn small ${overlayMode === 'gradcam' ? 'active primary' : ''}`}
              onClick={() => setOverlayMode('gradcam')}
              title="DenseNet-121 Grad-CAM Saliency"
            >
              <i className="fas fa-fire me-1"></i> Grad-CAM
            </button>
          )}
        </div>

        {/* Toolbar Controls */}
        <div className="d-flex align-items-center gap-1.5 flex-wrap d-print-none">
          <button onClick={handleZoomIn} className="glass-btn small" title="Zoom In">
            <i className="fas fa-search-plus"></i>
          </button>
          <button onClick={handleZoomOut} className="glass-btn small" title="Zoom Out">
            <i className="fas fa-search-minus"></i>
          </button>
          <button
            onClick={() => setInvert(!invert)}
            className={`glass-btn small ${invert ? 'active primary' : ''}`}
            title="Invert Contrast (Chest X-Ray Negative)"
          >
            <i className="fas fa-adjust me-1"></i> Invert
          </button>
          <button onClick={handleReset} className="glass-btn small" title="Reset Viewport">
            <i className="fas fa-undo me-1"></i> Reset
          </button>
        </div>
      </div>

      {/* Main Chest X-Ray Canvas */}
      <div
        ref={containerRef}
        className="pacs-viewer-container"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        style={{ cursor: isDragging ? 'grabbing' : 'grab', minHeight: '360px', position: 'relative', touchAction: 'none' }}
      >
        {origUrl ? (
          <div
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transition: isDragging ? 'none' : 'transform 0.15s ease-out',
              position: 'relative',
              display: 'inline-block'
            }}
          >
            {/* Base Chest X-Ray / 6-Zone Anatomical Canvas Layer */}
            <img
              src={overlayMode === 'zones' && zoneOverlayUrl ? zoneOverlayUrl : origUrl}
              alt={overlayMode === 'zones' ? '6-Zone Anatomical Segmentation' : 'Chest X-Ray Canvas'}
              className="pacs-image-layer"
              style={{ filter: filterStyle, maxHeight: '520px', width: 'auto', display: 'block' }}
              draggable={false}
            />

            {/* Grad-CAM Saliency Overlay Layer (only when gradcam mode is selected) */}
            {overlayMode === 'gradcam' && gradcamUrl && (
              <img
                src={gradcamUrl}
                alt="Grad-CAM Saliency Overlay"
                className="pacs-overlay-layer"
                style={{
                  opacity: overlayOpacity / 100,
                  filter: invert ? 'invert(100%)' : 'none',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  pointerEvents: 'none'
                }}
                draggable={false}
              />
            )}
          </div>
        ) : (
          <div className="text-center py-5 text-muted">
            <i className="fas fa-file-image fs-1 mb-2"></i>
            <p className="small mb-0">No Chest X-Ray study loaded</p>
          </div>
        )}

        {/* Viewport Overlay HUD Telemetry */}
        <div className="position-absolute top-0 start-0 m-3 d-flex flex-column gap-1 pointer-events-none d-print-none">
          <span className="badge bg-dark border border-secondary text-light font-monospace extra-small">
            ZOOM: {(zoom * 100).toFixed(0)}%
          </span>
          <span className="badge bg-dark border border-secondary text-light font-monospace extra-small">
            MODE: {overlayMode === 'zones' ? '6-ZONE DIP MAP' : overlayMode === 'gradcam' ? 'GRAD-CAM SALIENCY' : 'RAW CHEST X-RAY'}
          </span>
          <span className="badge bg-dark border border-secondary text-light font-monospace extra-small">
            CONTRAST: {contrast}% | BRIGHT: {brightness}%
          </span>
        </div>
      </div>

      {/* Interactive Controls Footbar */}
      <div className="p-3 bg-dark border-top border-secondary border-opacity-25 d-print-none">
        <div className="row g-3 align-items-center">
          {/* Contrast Adjustment Slider */}
          <div className="col-md-4">
            <label className="form-label extra-small text-secondary fw-semibold mb-1 d-flex justify-content-between">
              <span>Contrast Window</span>
              <span className="text-white font-monospace">{contrast}%</span>
            </label>
            <input
              type="range"
              min="50"
              max="200"
              value={contrast}
              onChange={(e) => setContrast(Number(e.target.value))}
              className="form-range form-range-sm"
            />
          </div>

          {/* Brightness Level Slider */}
          <div className="col-md-4">
            <label className="form-label extra-small text-secondary fw-semibold mb-1 d-flex justify-content-between">
              <span>Brightness Level</span>
              <span className="text-white font-monospace">{brightness}%</span>
            </label>
            <input
              type="range"
              min="50"
              max="200"
              value={brightness}
              onChange={(e) => setBrightness(Number(e.target.value))}
              className="form-range form-range-sm"
            />
          </div>

          {/* Active Overlay Blend Slider */}
          {overlayMode !== 'none' && (
            <div className="col-md-4">
              <label className="form-label extra-small text-cyan fw-bold mb-1 d-flex justify-content-between" style={{ color: 'var(--rad-cyan)' }}>
                <span>
                  {overlayMode === 'zones' ? '6-Zone DIP Blend' : 'Grad-CAM Blend'}
                </span>
                <span className="text-white font-monospace">{overlayOpacity}%</span>
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={overlayOpacity}
                onChange={(e) => setOverlayOpacity(Number(e.target.value))}
                className="form-range form-range-sm"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InteractiveXrayViewer;
