import React from 'react';

const MetricCard = ({ title, value, subtitle, icon, color = 'cyan', glow = false }) => {
  let glowClass = '';
  let iconBg = 'rgba(0, 242, 254, 0.15)';
  let iconColor = 'var(--rad-cyan)';

  if (color === 'rose') {
    if (glow) glowClass = 'rad-card-glow-rose';
    iconBg = 'rgba(244, 63, 94, 0.15)';
    iconColor = 'var(--rad-rose)';
  } else if (color === 'emerald') {
    if (glow) glowClass = 'rad-card-glow-emerald';
    iconBg = 'rgba(16, 185, 129, 0.15)';
    iconColor = 'var(--rad-emerald)';
  } else if (color === 'amber') {
    iconBg = 'rgba(245, 158, 11, 0.15)';
    iconColor = 'var(--rad-amber)';
  } else if (glow) {
    glowClass = 'rad-card-glow-cyan';
  }

  return (
    <div className={`rad-card p-3 h-100 ${glowClass}`}>
      <div className="d-flex align-items-center justify-content-between mb-2">
        <span className="text-uppercase fw-bold text-muted extra-small" style={{ letterSpacing: '0.05em' }}>
          {title}
        </span>
        <div
          className="rounded-3 d-flex align-items-center justify-content-center"
          style={{ width: '36px', height: '36px', background: iconBg, color: iconColor }}
        >
          <i className={`fas ${icon}`}></i>
        </div>
      </div>
      <div className="d-flex align-items-baseline gap-2">
        <h3 className="fw-extrabold text-white mb-0" style={{ fontFamily: 'var(--rad-mono)' }}>
          {value}
        </h3>
      </div>
      {subtitle && <small className="text-secondary extra-small mt-1 d-block">{subtitle}</small>}
    </div>
  );
};

export default MetricCard;
