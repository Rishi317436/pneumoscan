import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';

/**
 * PneumoniaVsNormalChart
 * Responsive Lightsaber Glass bar chart comparing verified Pneumonia vs Normal analysis outcomes.
 * Adheres strictly to the Lightsaber Green (#39FF14) design language.
 */
const PneumoniaVsNormalChart = ({
  pneumoniaCount = 0,
  normalCount = 0,
  unknownCount = 0,
  totalAnalyses = 0,
  earliestDate = null,
  latestDate = null,
  isLoading = false,
  isError = false,
  onRefresh = null
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [hoveredBar, setHoveredBar] = useState(null);

  const completed = (pneumoniaCount || 0) + (normalCount || 0);
  const total = totalAnalyses > 0 ? totalAnalyses : completed;
  const maxCount = Math.max(pneumoniaCount, normalCount, 1);

  const pneumoniaPct = completed > 0 ? ((pneumoniaCount / completed) * 100).toFixed(1) : '0.0';
  const normalPct = completed > 0 ? ((normalCount / completed) * 100).toFixed(1) : '0.0';

  // Format real date range from backend
  const formatDate = (d) => {
    if (!d) return null;
    try {
      return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return null;
    }
  };

  const startFormatted = formatDate(earliestDate);
  const endFormatted = formatDate(latestDate);
  const dateRangeStr = startFormatted && endFormatted
    ? `${startFormatted} – ${endFormatted}`
    : startFormatted || endFormatted || null;

  // Chart Theme Colors
  const colors = isLight
    ? {
        cardBg: 'rgba(255, 255, 255, 0.50)',
        cardBorder: 'rgba(255, 255, 255, 0.88)',
        cardShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.95), 0 10px 32px rgba(31, 62, 25, 0.12)',
        text: '#202820',
        muted: '#5c6a5a',
        subtle: '#778474',
        gridLine: 'rgba(50, 75, 45, 0.15)',
        normalBar: '#20c900',
        normalBarGlow: '0 0 16px rgba(32, 201, 0, 0.45)',
        pneumoniaBar: '#e11d48',
        pneumoniaBarGlow: '0 0 16px rgba(225, 29, 72, 0.35)',
        accent: '#39ff14',
        trackBg: 'rgba(50, 75, 45, 0.08)'
      }
    : {
        cardBg: 'rgba(26, 34, 26, 0.75)',
        cardBorder: 'rgba(57, 255, 20, 0.35)',
        cardShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.25), 0 10px 28px rgba(0, 0, 0, 0.45)',
        text: '#f3f6f0',
        muted: '#aab5a7',
        subtle: '#7e897b',
        gridLine: 'rgba(210, 229, 204, 0.12)',
        normalBar: '#39ff14',
        normalBarGlow: '0 0 18px rgba(57, 255, 20, 0.65)',
        pneumoniaBar: '#f43f5e',
        pneumoniaBarGlow: '0 0 18px rgba(244, 63, 94, 0.65)',
        accent: '#39ff14',
        trackBg: 'rgba(10, 15, 10, 0.45)'
      };

  return (
    <div
      className="p-4 rounded-4 transition-all"
      style={{
        background: colors.cardBg,
        border: `1px solid ${colors.cardBorder}`,
        boxShadow: colors.cardShadow,
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        color: colors.text,
        position: 'relative'
      }}
    >
      {/* Chart Header */}
      <div className="d-flex justify-content-between align-items-start mb-3 flex-wrap gap-2">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1">
            <span
              style={{
                fontFamily: 'monospace',
                fontSize: '11px',
                color: colors.accent,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase'
              }}
            >
              ANALYTICS / REAL-TIME COHORT
            </span>
          </div>
          <h5 className="fw-bold mb-1" style={{ letterSpacing: '-0.02em', color: colors.text }}>
            Pneumonia vs Normal Results
          </h5>
          <p className="small mb-0" style={{ color: colors.muted, fontSize: '0.82rem' }}>
            Comparative diagnostic distribution of completed patient Chest X-Ray analyses.
          </p>
        </div>

        <div className="d-flex align-items-center gap-2">
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="btn btn-sm"
              title="Refresh analysis metrics"
              style={{
                border: `1px solid ${colors.cardBorder}`,
                color: colors.text,
                background: 'rgba(57, 255, 20, 0.1)',
                borderRadius: '8px',
                fontSize: '0.78rem'
              }}
            >
              <i className="fas fa-sync-alt me-1"></i> Refresh
            </button>
          )}
        </div>
      </div>

      {/* Live Data Summary Strip */}
      <div
        className="d-flex justify-content-between align-items-center p-2.5 rounded-3 mb-4 flex-wrap gap-2"
        style={{
          background: colors.trackBg,
          border: `1px solid ${colors.gridLine}`,
          fontSize: '0.78rem',
          fontFamily: 'monospace'
        }}
      >
        <div>
          <span style={{ color: colors.muted }}>Completed Analyses: </span>
          <strong style={{ color: colors.text }}>{completed}</strong>
        </div>
        {dateRangeStr && (
          <div>
            <span style={{ color: colors.muted }}>Date Range: </span>
            <strong style={{ color: colors.accent }}>{dateRangeStr}</strong>
          </div>
        )}
        {unknownCount > 0 && (
          <div>
            <span style={{ color: colors.subtle }}>Unclassified/Pending: </span>
            <strong className="text-warning">{unknownCount}</strong>
          </div>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-5">
          <div className="spinner-border" role="status" style={{ color: colors.accent, width: '2.5rem', height: '2.5rem' }}></div>
          <p className="mt-2 small" style={{ color: colors.muted }}>Loading analysis records...</p>
        </div>
      )}

      {/* Error State */}
      {isError && !isLoading && (
        <div className="p-4 text-center rounded-3 my-3" style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)' }}>
          <i className="fas fa-exclamation-triangle text-danger fs-3 mb-2"></i>
          <p className="mb-2 fw-semibold text-danger">Failed to load analysis outcomes from database.</p>
          {onRefresh && (
            <button onClick={onRefresh} className="btn btn-sm btn-outline-danger">
              Retry Query
            </button>
          )}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && completed === 0 && (
        <div
          className="text-center py-5 rounded-3 my-2"
          style={{ border: `1px dashed ${colors.gridLine}`, background: colors.trackBg }}
        >
          <i className="fas fa-chart-bar fs-2 mb-2" style={{ color: colors.subtle }}></i>
          <strong className="d-block" style={{ color: colors.text }}>No completed analysis records found</strong>
          <span className="extra-small" style={{ color: colors.muted }}>
            Submit Chest X-Rays through the workstation to populate live diagnostic metrics.
          </span>
        </div>
      )}

      {/* Active Chart View */}
      {!isLoading && !isError && completed > 0 && (
        <div>
          {/* Main Bar Chart Container */}
          <div className="row g-4 align-items-center mb-3">
            {/* Category 1: Normal Results */}
            <div className="col-12 col-md-6">
              <div
                className="p-3 rounded-3 transition-all"
                style={{
                  background: hoveredBar === 'normal' ? 'rgba(57, 255, 20, 0.12)' : colors.trackBg,
                  border: `1px solid ${hoveredBar === 'normal' ? colors.normalBar : colors.gridLine}`,
                  cursor: 'pointer'
                }}
                onMouseEnter={() => setHoveredBar('normal')}
                onMouseLeave={() => setHoveredBar(null)}
              >
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <div className="d-flex align-items-center gap-2">
                    <span
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '3px',
                        background: colors.normalBar,
                        boxShadow: colors.normalBarGlow
                      }}
                    ></span>
                    <strong style={{ color: colors.text, fontSize: '0.92rem' }}>Normal Results</strong>
                  </div>
                  <span className="badge rounded-pill" style={{ background: 'rgba(57, 255, 20, 0.15)', color: colors.normalBar, border: `1px solid ${colors.normalBar}` }}>
                    {normalPct}%
                  </span>
                </div>

                <div className="d-flex align-items-baseline justify-content-between my-2">
                  <span className="fs-3 fw-extrabold" style={{ fontFamily: 'monospace', color: colors.normalBar }}>
                    {normalCount}
                  </span>
                  <span className="extra-small" style={{ color: colors.muted }}>
                    Unremarkable parenchyma
                  </span>
                </div>

                {/* Bar Visualizer */}
                <div
                  className="rounded-pill overflow-hidden position-relative"
                  style={{ height: '14px', background: 'rgba(0,0,0,0.2)', border: `1px solid ${colors.gridLine}` }}
                >
                  <div
                    className="h-100 rounded-pill transition-all"
                    style={{
                      width: `${(normalCount / maxCount) * 100}%`,
                      background: `linear-gradient(90deg, ${colors.normalBar}, #10b981)`,
                      boxShadow: colors.normalBarGlow,
                      transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Category 2: Pneumonia Results */}
            <div className="col-12 col-md-6">
              <div
                className="p-3 rounded-3 transition-all"
                style={{
                  background: hoveredBar === 'pneumonia' ? 'rgba(244, 63, 94, 0.12)' : colors.trackBg,
                  border: `1px solid ${hoveredBar === 'pneumonia' ? colors.pneumoniaBar : colors.gridLine}`,
                  cursor: 'pointer'
                }}
                onMouseEnter={() => setHoveredBar('pneumonia')}
                onMouseLeave={() => setHoveredBar(null)}
              >
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <div className="d-flex align-items-center gap-2">
                    <span
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '3px',
                        background: colors.pneumoniaBar,
                        boxShadow: colors.pneumoniaBarGlow
                      }}
                    ></span>
                    <strong style={{ color: colors.text, fontSize: '0.92rem' }}>Pneumonia Suspected</strong>
                  </div>
                  <span className="badge rounded-pill" style={{ background: 'rgba(244, 63, 94, 0.15)', color: colors.pneumoniaBar, border: `1px solid ${colors.pneumoniaBar}` }}>
                    {pneumoniaPct}%
                  </span>
                </div>

                <div className="d-flex align-items-baseline justify-content-between my-2">
                  <span className="fs-3 fw-extrabold" style={{ fontFamily: 'monospace', color: colors.pneumoniaBar }}>
                    {pneumoniaCount}
                  </span>
                  <span className="extra-small" style={{ color: colors.muted }}>
                    Focal consolidation / opacities (Eval Req.)
                  </span>
                </div>

                {/* Bar Visualizer */}
                <div
                  className="rounded-pill overflow-hidden position-relative"
                  style={{ height: '14px', background: 'rgba(0,0,0,0.2)', border: `1px solid ${colors.gridLine}` }}
                >
                  <div
                    className="h-100 rounded-pill transition-all"
                    style={{
                      width: `${(pneumoniaCount / maxCount) * 100}%`,
                      background: `linear-gradient(90deg, ${colors.pneumoniaBar}, #e11d48)`,
                      boxShadow: colors.pneumoniaBarGlow,
                      transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Stacked Proportional Distribution Track */}
          <div className="mt-3 pt-3 border-top" style={{ borderColor: colors.gridLine }}>
            <div className="d-flex justify-content-between align-items-center mb-1.5 extra-small">
              <span style={{ color: colors.muted }}>PROPORTIONAL COHORT SHARE</span>
              <span style={{ fontFamily: 'monospace', color: colors.subtle }}>
                {completed} TOTAL VALIDATED OUTCOMES
              </span>
            </div>
            <div
              className="d-flex rounded-pill overflow-hidden"
              style={{ height: '10px', background: 'rgba(0,0,0,0.3)', border: `1px solid ${colors.gridLine}` }}
            >
              <div
                style={{
                  width: `${normalPct}%`,
                  background: colors.normalBar,
                  boxShadow: colors.normalBarGlow
                }}
                title={`Normal: ${normalCount} (${normalPct}%)`}
              ></div>
              <div
                style={{
                  width: `${pneumoniaPct}%`,
                  background: colors.pneumoniaBar,
                  boxShadow: colors.pneumoniaBarGlow
                }}
                title={`Pneumonia: ${pneumoniaCount} (${pneumoniaPct}%)`}
              ></div>
            </div>
            <div className="d-flex justify-content-between align-items-center mt-1 extra-small" style={{ fontFamily: 'monospace', color: colors.subtle }}>
              <span>Normal ({normalPct}%)</span>
              <span>Pneumonia ({pneumoniaPct}%)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PneumoniaVsNormalChart;
