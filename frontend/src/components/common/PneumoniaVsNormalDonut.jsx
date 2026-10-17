import React, { useState } from 'react';

/**
 * PneumoniaVsNormalDonut
 * Professional Lightsaber Glass SVG Donut Chart comparing:
 * - Pneumonia-positive results
 * - Normal results
 */
const PneumoniaVsNormalDonut = ({
  pneumoniaCount = 0,
  normalCount = 0,
  unknownCount = 0,
  totalAnalyses = 0,
  isLoading = false,
  isError = false
}) => {
  const [hoveredSlice, setHoveredSlice] = useState(null);

  const safePneumonia = Math.max(0, Number(pneumoniaCount) || 0);
  const safeNormal = Math.max(0, Number(normalCount) || 0);
  const safeUnknown = Math.max(0, Number(unknownCount) || 0);
  const total = totalAnalyses > 0 ? totalAnalyses : (safePneumonia + safeNormal + safeUnknown);

  const pneuPct = total > 0 ? ((safePneumonia / total) * 100).toFixed(1) : '0.0';
  const normPct = total > 0 ? ((safeNormal / total) * 100).toFixed(1) : '0.0';
  const unkPct = total > 0 ? ((safeUnknown / total) * 100).toFixed(1) : '0.0';

  // SVG Donut geometry
  const size = 200;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2; // 88
  const circumference = 2 * Math.PI * radius; // ~552.92

  // Normal arc stroke-dasharray & stroke-dashoffset
  const normDash = total > 0 ? (safeNormal / total) * circumference : 0;
  // Pneumonia arc
  const pneuDash = total > 0 ? (safePneumonia / total) * circumference : 0;
  // Unknown arc
  const unkDash = total > 0 ? (safeUnknown / total) * circumference : 0;

  // Offsets
  const normOffset = 0;
  const pneuOffset = -normDash;
  const unkOffset = -(normDash + pneuDash);

  return (
    <div className="glass-card p-4 h-100 d-flex flex-column justify-content-between">
      {/* Card Header */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="d-flex align-items-center gap-2">
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '8px',
            display: 'grid',
            placeItems: 'center',
            background: 'rgba(57, 255, 20, 0.15)',
            border: '1px solid #39ff14',
            color: '#39ff14'
          }}>
            <i className="fas fa-chart-pie" style={{ fontSize: '13px' }}></i>
          </div>
          <h6 className="fw-bold text-white mb-0 small text-uppercase" style={{ letterSpacing: '0.05em' }}>
            Diagnostic Distribution (Donut)
          </h6>
        </div>
        <span className="badge extra-small font-monospace" style={{
          background: 'rgba(57, 255, 20, 0.15)',
          color: '#39ff14',
          border: '1px solid rgba(57, 255, 20, 0.35)'
        }}>
          {total} Total Studies
        </span>
      </div>

      {isLoading ? (
        <div className="text-center py-5">
          <div className="spinner-border" role="status" style={{ color: '#39ff14' }}></div>
          <p className="text-secondary extra-small mt-2 font-monospace">Aggregating telemetry...</p>
        </div>
      ) : total === 0 ? (
        <div className="text-center py-5 text-secondary extra-small font-monospace">
          <i className="fas fa-chart-pie fs-3 mb-2 opacity-50"></i>
          <p className="mb-0">No completed scan analyses available</p>
        </div>
      ) : (
        <div className="row g-3 align-items-center my-auto">
          {/* Donut SVG Visualizer */}
          <div className="col-sm-6 text-center position-relative">
            <svg
              width={size}
              height={size}
              viewBox={`0 0 ${size} ${size}`}
              className="mx-auto"
              style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}
            >
              {/* Background Track Circle */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="rgba(255, 255, 255, 0.08)"
                strokeWidth={strokeWidth}
              />

              {/* Normal Slice */}
              {safeNormal > 0 && (
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke="#39ff14"
                  strokeWidth={hoveredSlice === 'normal' ? strokeWidth + 4 : strokeWidth}
                  strokeDasharray={`${normDash} ${circumference}`}
                  strokeDashoffset={normOffset}
                  strokeLinecap="round"
                  style={{
                    filter: 'drop-shadow(0 0 8px rgba(57, 255, 20, 0.65))',
                    transition: 'stroke-width 0.2s, stroke 0.2s',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={() => setHoveredSlice('normal')}
                  onMouseLeave={() => setHoveredSlice(null)}
                />
              )}

              {/* Pneumonia Slice */}
              {safePneumonia > 0 && (
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke="#ff3366"
                  strokeWidth={hoveredSlice === 'pneumonia' ? strokeWidth + 4 : strokeWidth}
                  strokeDasharray={`${pneuDash} ${circumference}`}
                  strokeDashoffset={pneuOffset}
                  strokeLinecap="round"
                  style={{
                    filter: 'drop-shadow(0 0 8px rgba(255, 51, 102, 0.65))',
                    transition: 'stroke-width 0.2s, stroke 0.2s',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={() => setHoveredSlice('pneumonia')}
                  onMouseLeave={() => setHoveredSlice(null)}
                />
              )}

              {/* Unknown/Pending Slice */}
              {safeUnknown > 0 && (
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke="#64748b"
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${unkDash} ${circumference}`}
                  strokeDashoffset={unkOffset}
                  strokeLinecap="round"
                  style={{ opacity: 0.6 }}
                />
              )}
            </svg>

            {/* Centered Readout In Hole */}
            <div
              className="position-absolute top-50 start-50 translate-middle text-center pointer-events-none"
              style={{ width: '100px' }}
            >
              {hoveredSlice === 'normal' ? (
                <>
                  <span className="extra-small text-uppercase font-monospace d-block" style={{ color: '#39ff14', fontSize: '10px' }}>
                    Normal
                  </span>
                  <strong className="text-white fw-extrabold fs-4">{normPct}%</strong>
                  <small className="d-block text-secondary extra-small font-monospace">{safeNormal} scans</small>
                </>
              ) : hoveredSlice === 'pneumonia' ? (
                <>
                  <span className="extra-small text-uppercase font-monospace d-block" style={{ color: '#ff3366', fontSize: '10px' }}>
                    Pneumonia
                  </span>
                  <strong className="text-white fw-extrabold fs-4">{pneuPct}%</strong>
                  <small className="d-block text-secondary extra-small font-monospace">{safePneumonia} scans</small>
                </>
              ) : (
                <>
                  <span className="text-secondary extra-small text-uppercase font-monospace d-block" style={{ fontSize: '9px', letterSpacing: '0.08em' }}>
                    Total Cohort
                  </span>
                  <strong className="text-white fw-extrabold fs-3">{total}</strong>
                  <small className="d-block text-secondary extra-small font-monospace">Indexed</small>
                </>
              )}
            </div>
          </div>

          {/* Interactive Legend & Details */}
          <div className="col-sm-6">
            <div className="d-flex flex-column gap-2.5">
              {/* Normal Legend Item */}
              <div
                className={`p-2.5 rounded-3 border d-flex align-items-center justify-content-between cursor-pointer ${
                  hoveredSlice === 'normal' ? 'border-success' : 'border-secondary border-opacity-25'
                }`}
                style={{
                  background: hoveredSlice === 'normal' ? 'rgba(57, 255, 20, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                  transition: 'background 0.2s, border-color 0.2s'
                }}
                onMouseEnter={() => setHoveredSlice('normal')}
                onMouseLeave={() => setHoveredSlice(null)}
              >
                <div className="d-flex align-items-center gap-2">
                  <span
                    style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      background: '#39ff14',
                      boxShadow: '0 0 8px rgba(57, 255, 20, 0.8)',
                      display: 'inline-block'
                    }}
                  ></span>
                  <div>
                    <strong className="text-white small d-block" style={{ fontSize: '12px' }}>Normal Parenchyma</strong>
                    <span className="text-secondary extra-small font-monospace">Clear lung fields</span>
                  </div>
                </div>
                <div className="text-end font-monospace">
                  <strong className="text-white small d-block" style={{ color: '#39ff14' }}>{safeNormal}</strong>
                  <span className="text-secondary extra-small">{normPct}%</span>
                </div>
              </div>

              {/* Pneumonia Legend Item */}
              <div
                className={`p-2.5 rounded-3 border d-flex align-items-center justify-content-between cursor-pointer ${
                  hoveredSlice === 'pneumonia' ? 'border-danger' : 'border-secondary border-opacity-25'
                }`}
                style={{
                  background: hoveredSlice === 'pneumonia' ? 'rgba(255, 51, 102, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                  transition: 'background 0.2s, border-color 0.2s'
                }}
                onMouseEnter={() => setHoveredSlice('pneumonia')}
                onMouseLeave={() => setHoveredSlice(null)}
              >
                <div className="d-flex align-items-center gap-2">
                  <span
                    style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      background: '#ff3366',
                      boxShadow: '0 0 8px rgba(255, 51, 102, 0.8)',
                      display: 'inline-block'
                    }}
                  ></span>
                  <div>
                    <strong className="text-white small d-block" style={{ fontSize: '12px' }}>Pneumonia Positive</strong>
                    <span className="text-secondary extra-small font-monospace">Infiltrate / Opacity</span>
                  </div>
                </div>
                <div className="text-end font-monospace">
                  <strong className="text-white small d-block" style={{ color: '#ff3366' }}>{safePneumonia}</strong>
                  <span className="text-secondary extra-small">{pneuPct}%</span>
                </div>
              </div>

              {/* Unclassified / Pending (if present) */}
              {safeUnknown > 0 && (
                <div className="p-2 rounded border border-secondary border-opacity-25 d-flex align-items-center justify-content-between bg-dark bg-opacity-25">
                  <div className="d-flex align-items-center gap-2">
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#64748b' }}></span>
                    <span className="text-secondary extra-small font-monospace">Unclassified / Incomplete</span>
                  </div>
                  <span className="text-secondary extra-small font-monospace">{safeUnknown} ({unkPct}%)</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer Meta */}
      <div className="d-flex justify-content-between align-items-center pt-3 border-top border-secondary border-opacity-25 mt-3 extra-small font-monospace text-secondary">
        <span>Verified Chest X-Ray Telemetry</span>
        <span style={{ color: '#39ff14' }}>
          <i className="fas fa-check-circle me-1"></i> Live PACS DB
        </span>
      </div>
    </div>
  );
};

export default PneumoniaVsNormalDonut;
