import React, { useState, useEffect } from 'react';

const PredictionProgressTracker = ({ isProcessing }) => {
  const [secondsRemaining, setSecondsRemaining] = useState(20);
  const [percent, setPercent] = useState(5);

  useEffect(() => {
    if (!isProcessing) {
      setSecondsRemaining(20);
      setPercent(5);
      return;
    }

    const startTime = Date.now();
    const totalDuration = 20000; // 20s typical run for full DIP + DenseNet-121 LiteRT

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / totalDuration) * 100, 95);
      const remaining = Math.max(Math.ceil((totalDuration - elapsed) / 1000), 1);

      setPercent(Math.round(progress));
      setSecondsRemaining(remaining);
    }, 200);

    return () => clearInterval(interval);
  }, [isProcessing]);

  if (!isProcessing) return null;

  return (
    <div className="glass-card p-4 mb-4 text-center" style={{ border: '1px solid var(--lightsaber-green, #39ff14)' }}>
      <div className="py-3 d-flex flex-column align-items-center justify-content-center">
        {/* Animated Pulsing Medical Spinner with Lightsaber Green Glow */}
        <div className="position-relative mb-3 d-flex align-items-center justify-content-center" style={{ width: '84px', height: '84px' }}>
          <div
            className="spinner-border"
            role="status"
            style={{ 
              width: '84px', 
              height: '84px', 
              borderWidth: '3.5px', 
              color: '#39ff14',
              filter: 'drop-shadow(0 0 12px rgba(57, 255, 20, 0.6))' 
            }}
          ></div>
          <div
            className="position-absolute d-flex align-items-center justify-content-center rounded-circle"
            style={{
              width: '56px',
              height: '56px',
              backgroundColor: 'rgba(57, 255, 20, 0.12)',
              border: '1px solid rgba(57, 255, 20, 0.4)'
            }}
          >
            <i className="fas fa-lungs fa-lg" style={{ color: '#39ff14' }}></i>
          </div>
        </div>

        <h5 className="fw-extrabold text-white mb-1" style={{ letterSpacing: '0.02em' }}>
          Analyzing Chest X-Ray...
        </h5>
        
        {/* Dynamic Countdown Timer */}
        <div className="badge my-2 px-3 py-2" style={{
          background: 'rgba(57, 255, 20, 0.15)',
          border: '1px solid #39ff14',
          color: '#39ff14',
          fontSize: '0.85rem',
          fontFamily: 'SFMono-Regular, Consolas, monospace'
        }}>
          <i className="far fa-clock me-1.5"></i>
          Estimated remaining time: ~{secondsRemaining}s ({percent}%)
        </div>

        <p className="text-secondary small mb-3" style={{ maxWidth: '480px' }}>
          Executing anatomical 6-zone segmentation and Chest X-Ray pattern analysis...
        </p>

        {/* Clean Lightsaber Green Progress Bar */}
        <div
          className="progress bg-dark w-100"
          style={{ 
            height: '8px', 
            maxWidth: '380px', 
            borderRadius: '999px', 
            overflow: 'hidden',
            border: '1px solid rgba(57, 255, 20, 0.35)',
            background: 'rgba(15, 23, 15, 0.8)'
          }}
        >
          <div
            className="progress-bar progress-bar-striped progress-bar-animated"
            role="progressbar"
            style={{ 
              width: `${percent}%`, 
              backgroundColor: '#39ff14',
              boxShadow: '0 0 14px rgba(57, 255, 20, 0.9)',
              transition: 'width 0.2s linear'
            }}
          ></div>
        </div>
      </div>
    </div>
  );
};

export default PredictionProgressTracker;
