import React from 'react';
import { Link } from 'react-router-dom';
import MetricCard from '../components/common/MetricCard';
import { SkeletonCard, SkeletonTableRow } from '../components/common/SkeletonLoader';
import { useDashboard } from '../hooks/useDashboard';
import { getImageUrl } from '../services/api';
import PneumoniaVsNormalChart from '../components/common/PneumoniaVsNormalChart';
import PneumoniaVsNormalDonut from '../components/common/PneumoniaVsNormalDonut';

const RadiologyDashboard = () => {
  const { data, isLoading, isError, refetch } = useDashboard();

  const summary = data?.summary || {
    totalScans: 0,
    pneumoniaCount: 0,
    normalCount: 0,
    agreeCount: 0,
    disagreeCount: 0,
    positivityRate: 0,
    concordanceRate: 0,
    avgConfidence: 0
  };

  const recentScans = data?.recentScans || [];
  const weeklyTrend = data?.weeklyTrend || [];

  return (
    <div className="container-fluid py-4 px-lg-4">
      {/* Dashboard Header */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h2 className="fw-extrabold text-white mb-1 d-flex align-items-center gap-2">
            <i className="fas fa-chart-line text-cyan" style={{ color: 'var(--rad-cyan)' }}></i>
            <span>Chest X-Ray Analytics & Telemetry</span>
          </h2>
          <p className="text-secondary small mb-0">
            Real-time cohort performance, diagnostic concordance distributions, and recent study telemetry.
          </p>
        </div>
        <div className="d-flex gap-2">
          <button onClick={() => refetch()} className="glass-btn small">
            <i className="fas fa-sync-alt me-1.5"></i> Refresh
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="row g-2 g-md-4 mb-4">
          <div className="col-6 col-md-3"><SkeletonCard height="60px" /></div>
          <div className="col-6 col-md-3"><SkeletonCard height="60px" /></div>
          <div className="col-6 col-md-3"><SkeletonCard height="60px" /></div>
          <div className="col-6 col-md-3"><SkeletonCard height="60px" /></div>
        </div>
      ) : (
        /* Top 4 KPI Tiles */
        <div className="row g-2 g-md-3 mb-4">
          <div className="col-6 col-md-3">
            <MetricCard
              title="Total Chest X-Rays"
              value={summary.totalScans}
              subtitle="Indexed patient studies"
              icon="fa-x-ray"
              color="cyan"
              glow
            />
          </div>
          <div className="col-6 col-md-3">
            <MetricCard
              title="Positivity Rate"
              value={`${summary.positivityRate}%`}
              subtitle={`${summary.pneumoniaCount} Pneumonia Suspected`}
              icon="fa-virus"
              color={summary.positivityRate > 50 ? 'rose' : 'emerald'}
              glow={summary.positivityRate > 50}
            />
          </div>
          <div className="col-6 col-md-3">
            <MetricCard
              title="Model Confidence"
              value={`${summary.avgConfidence}%`}
              subtitle="DenseNet-121 Mean Probability"
              icon="fa-brain"
              color="cyan"
            />
          </div>
          <div className="col-6 col-md-3">
            <MetricCard
              title="Dual Concordance"
              value={`${summary.concordanceRate}%`}
              subtitle={`${summary.agreeCount} Mutual Agreements`}
              icon="fa-balance-scale"
              color="amber"
            />
          </div>
        </div>
      )}

      {/* Diagnostic Analytics Visualizers: Bar Graph & Donut Chart */}
      <div className="row g-4 mb-4">
        <div className="col-xl-7">
          <PneumoniaVsNormalChart
            pneumoniaCount={summary.pneumoniaCount}
            normalCount={summary.normalCount}
            unknownCount={summary.unknownCount || 0}
            totalAnalyses={summary.completedAnalyses || (summary.pneumoniaCount + summary.normalCount)}
            earliestDate={summary.earliestDate}
            latestDate={summary.latestDate}
            isLoading={isLoading}
            isError={isError}
            onRefresh={refetch}
          />
        </div>
        <div className="col-xl-5">
          <PneumoniaVsNormalDonut
            pneumoniaCount={summary.pneumoniaCount}
            normalCount={summary.normalCount}
            unknownCount={summary.unknownCount || 0}
            totalAnalyses={summary.completedAnalyses || (summary.pneumoniaCount + summary.normalCount)}
            isLoading={isLoading}
            isError={isError}
          />
        </div>
      </div>

      {/* Main Analytics Row */}
      <div className="row g-4 mb-4">
        {/* Recent Ingestion Worklist Table */}
        <div className="col-xl-8">
          <div className="rad-card h-100 overflow-hidden">
            <div className="rad-card-header">
              <span className="fw-bold text-white small text-uppercase" style={{ letterSpacing: '0.04em' }}>
                <i className="fas fa-list-alt me-2 text-cyan" style={{ color: 'var(--rad-cyan)' }}></i>
                Recent Diagnostic Studies
              </span>
              <Link to="/worklist" className="rad-btn-outline btn-sm py-1 px-2.5 extra-small">
                Full Worklist &rarr;
              </Link>
            </div>
            <div className="rad-card-body p-0">
              <div className="table-responsive">
                <table className="table table-dark table-hover align-middle mb-0 extra-small">
                  <thead>
                    <tr className="border-bottom border-secondary border-opacity-25 text-muted text-uppercase">
                      <th className="ps-3 py-3">Study File</th>
                      <th>Traditional DIP</th>
                      <th>DenseNet-121</th>
                      <th>Confidence</th>
                      <th>Concordance</th>
                      <th className="text-end pe-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      Array.from({ length: 4 }).map((_, i) => <SkeletonTableRow key={i} cols={6} />)
                    ) : recentScans.length > 0 ? (
                      recentScans.map((scan) => {
                        const filename = scan.scanId?.filename || (scan.originalImage ? scan.originalImage.split(/[\\/]/).pop() : 'Chest_XRay.jpg');
                        const mlPred = scan.mlDetection?.prediction;
                        const manualPred = scan.manualDetection?.prediction;
                        const mlConf = typeof scan.mlDetection?.confidence === 'number'
                          ? (scan.mlDetection.confidence <= 1 ? scan.mlDetection.confidence * 100 : scan.mlDetection.confidence).toFixed(1)
                          : '0.0';

                        return (
                          <tr key={scan._id} className="border-bottom border-secondary border-opacity-10">
                            <td className="ps-3 fw-bold text-white">
                              <i className="fas fa-file-image me-2 text-cyan" style={{ color: 'var(--rad-cyan)' }}></i>
                              {filename}
                            </td>
                            <td>
                              {manualPred === 'PNEUMONIA' ? (
                                <span className="badge rad-badge-pneumonia text-wrap text-start">Pneumonia Suspected — Further Clinical Evaluation Required</span>
                              ) : (
                                <span className="badge rad-badge-normal">Normal</span>
                              )}
                            </td>
                            <td>
                              {mlPred === 'PNEUMONIA' ? (
                                <span className="badge rad-badge-pneumonia text-wrap text-start">Pneumonia Suspected — Further Clinical Evaluation Required</span>
                              ) : (
                                <span className="badge rad-badge-normal">Normal</span>
                              )}
                            </td>
                            <td className="font-monospace text-cyan" style={{ color: 'var(--rad-cyan)' }}>
                              {mlConf}%
                            </td>
                            <td>
                              <span className="badge rad-badge-agree">AGREE</span>
                            </td>
                            <td className="text-end pe-3">
                              <Link to={`/study/${scan._id}`} className="rad-btn-outline btn-sm py-1 px-2.5 extra-small">
                                PACS View
                              </Link>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="6" className="text-center py-5 text-muted">
                          No studies ingested yet. <Link to="/workspace" className="text-cyan">Mount first study</Link>.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* 7-Day Ingestion Trend & Classification Breakdown */}
        <div className="col-xl-4 d-flex flex-column gap-4">
          <div className="rad-card p-4">
            <h6 className="fw-bold text-white small text-uppercase mb-3" style={{ letterSpacing: '0.04em' }}>
              <i className="fas fa-calendar-week me-2 text-cyan" style={{ color: 'var(--rad-cyan)' }}></i>
              7-Day Study Ingestion Volume
            </h6>
            {weeklyTrend.length > 0 ? (
              <div className="d-flex flex-column gap-2">
                {weeklyTrend.map((day) => (
                  <div key={day._id} className="p-2.5 rounded-3 glass-item border border-secondary border-opacity-25 d-flex justify-content-between align-items-center extra-small font-monospace">
                    <span className="text-secondary">{day._id}</span>
                    <div className="d-flex align-items-center gap-2">
                      <span className="badge bg-secondary text-white">{day.count} Studies</span>
                      {day.pneumonia > 0 && (
                        <span className="badge bg-danger text-white">{day.pneumonia} Positive</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-muted small">
                No telemetry recorded in past 7 days.
              </div>
            )}
          </div>

          <div className="rad-card p-4">
            <h6 className="fw-bold text-white small text-uppercase mb-3" style={{ letterSpacing: '0.04em' }}>
              <i className="fas fa-pie-chart me-2 text-cyan" style={{ color: 'var(--rad-cyan)' }}></i>
              Classification Concordance
            </h6>
            <div className="d-flex justify-content-between align-items-center p-3 rounded-3 glass-item mb-2 border border-secondary border-opacity-25">
              <span className="text-secondary small">Mutual Agreement (Concordant)</span>
              <span className="badge rad-badge-agree font-monospace fs-6">{summary.agreeCount}</span>
            </div>
            <div className="d-flex justify-content-between align-items-center p-3 rounded-3 glass-item border border-secondary border-opacity-25">
              <span className="text-secondary small">Model Disagreement (Discordant)</span>
              <span className="badge rad-badge-disagree font-monospace fs-6">{summary.disagreeCount}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RadiologyDashboard;
