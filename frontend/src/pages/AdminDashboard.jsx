import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI } from '../services/api';

const AdminDashboard = () => {
  const [data, setData] = useState({
    stats: { users: 0, scans: 0, pneumoniaDetected: 0, pendingFeedback: 0 },
    recentLogs: [],
    feedbacks: []
  });
  const [replyText, setReplyText] = useState({});
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getDashboard();
      if (res.data.success) {
        setData({
          stats: res.data.stats || { users: 0, scans: 0, pneumoniaDetected: 0, pendingFeedback: 0 },
          recentLogs: res.data.recentLogs || [],
          feedbacks: res.data.feedbacks || []
        });
      } else {
        setErrorMsg(res.data.message || 'Failed to load dashboard data.');
      }
    } catch (err) {
      console.error('Admin dashboard error:', err);
      setErrorMsg('Failed to load administrator control panel.');
    } finally {
      setLoading(false);
    }
  };

  const handleReplyChange = (id, text) => {
    setReplyText(prev => ({ ...prev, [id]: text }));
  };

  const handleReplySubmit = async (e, id) => {
    e.preventDefault();
    const text = replyText[id];
    if (!text || !text.trim()) return;

    try {
      const res = await adminAPI.respondFeedback(id, text);
      if (res.data.success) {
        setSuccessMsg('Feedback response sent successfully.');
        setReplyText(prev => ({ ...prev, [id]: '' }));
        fetchDashboard();
      }
    } catch (err) {
      console.error('Reply feedback error:', err);
      setErrorMsg('Failed to send feedback response.');
    }
  };

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h2 className="fw-extrabold text-dark mb-1 d-flex align-items-center gap-2">
            <i className="fas fa-user-shield text-teal" style={{ color: '#14b8a6' }}></i>
            <span>Administrator Control Panel</span>
          </h2>
          <p className="text-muted small mb-0">
            Platform overview, user management, and clinical model configuration.
          </p>
        </div>
        <div className="d-flex gap-2">
          <Link to="/admin/users" className="btn btn-outline-primary btn-sm d-inline-flex align-items-center gap-1.5">
            <i className="fas fa-users"></i> Manage Users
          </Link>
          <Link to="/admin/training" className="btn btn-primary btn-sm d-inline-flex align-items-center gap-1.5 shadow-sm">
            <i className="fas fa-cogs"></i> Model & Training Hub
          </Link>
        </div>
      </div>

      {successMsg && (
        <div className="alert alert-success alert-dismissible fade show shadow-sm border-0 mb-4">
          <i className="fas fa-check-circle me-2"></i>
          {successMsg}
          <button type="button" className="btn-close" onClick={() => setSuccessMsg('')}></button>
        </div>
      )}

      {errorMsg && (
        <div className="alert alert-danger alert-dismissible fade show shadow-sm border-0 mb-4">
          <i className="fas fa-exclamation-triangle me-2"></i>
          {errorMsg}
          <button type="button" className="btn-close" onClick={() => setErrorMsg('')}></button>
        </div>
      )}

      {loading ? (
        <div className="d-flex justify-content-center py-5">
          <div className="spinner-border text-teal" role="status">
            <span className="visually-hidden">Loading admin panel...</span>
          </div>
        </div>
      ) : (
        <>
          {/* Stats Cards Grid */}
          <div className="row g-3 mb-4">
            <div className="col-md-3">
              <div className="card h-100 shadow-sm border-0 stat-card-primary">
                <div className="card-body p-3 d-flex align-items-center gap-3">
                  <div className="stat-icon-wrapper bg-primary-subtle text-primary">
                    <i className="fas fa-users"></i>
                  </div>
                  <div>
                    <span className="text-secondary extra-small fw-bold text-uppercase d-block">Registered Users</span>
                    <h4 className="fw-extrabold text-dark mb-0">{data.stats.users}</h4>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-3">
              <div className="card h-100 shadow-sm border-0 stat-card-success">
                <div className="card-body p-3 d-flex align-items-center gap-3">
                  <div className="stat-icon-wrapper bg-success-subtle text-success">
                    <i className="fas fa-lungs"></i>
                  </div>
                  <div>
                    <span className="text-secondary extra-small fw-bold text-uppercase d-block">Total X-Rays Analyzed</span>
                    <h4 className="fw-extrabold text-dark mb-0">{data.stats.scans}</h4>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-3">
              <div className="card h-100 shadow-sm border-0 stat-card-danger">
                <div className="card-body p-3 d-flex align-items-center gap-3">
                  <div className="stat-icon-wrapper bg-danger-subtle text-danger">
                    <i className="fas fa-virus"></i>
                  </div>
                  <div>
                    <span className="text-secondary extra-small fw-bold text-uppercase d-block">Pneumonia Positives</span>
                    <h4 className="fw-extrabold text-danger mb-0">{data.stats.pneumoniaDetected}</h4>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-3">
              <div className="card h-100 shadow-sm border-0 stat-card-warning">
                <div className="card-body p-3 d-flex align-items-center gap-3">
                  <div className="stat-icon-wrapper bg-warning-subtle text-warning">
                    <i className="fas fa-comments"></i>
                  </div>
                  <div>
                    <span className="text-secondary extra-small fw-bold text-uppercase d-block">Pending Feedback</span>
                    <h4 className="fw-extrabold text-warning mb-0">{data.stats.pendingFeedback}</h4>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="row g-4 mb-4">
            {/* Recent Activity Logs */}
            <div className="col-lg-7">
              <div className="card shadow-sm border-0 h-100 overflow-hidden">
                <div className="card-header py-3 bg-dark text-white d-flex align-items-center justify-content-between">
                  <h6 className="mb-0 fw-bold d-flex align-items-center gap-2">
                    <i className="fas fa-list-alt text-teal" style={{ color: '#14b8a6' }}></i>
                    <span>Recent System Activity</span>
                  </h6>
                </div>
                <div className="card-body p-0">
                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0 extra-small">
                      <thead className="table-light text-uppercase">
                        <tr>
                          <th className="ps-3">User</th>
                          <th>Action</th>
                          <th>IP Address</th>
                          <th>Timestamp</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.recentLogs.length > 0 ? (
                          data.recentLogs.map((log) => (
                            <tr key={log._id}>
                              <td className="ps-3 fw-bold text-dark">{log.userId?.name || 'System/Guest'}</td>
                              <td>
                                <span className="badge bg-light text-secondary border">
                                  {log.action || log.activityType || 'Action'}
                                </span>
                              </td>
                              <td className="text-muted">{log.ipAddress || '127.0.0.1'}</td>
                              <td className="text-muted">
                                {new Date(log.createdAt || Date.now()).toLocaleTimeString()}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="4" className="text-center py-4 text-muted">
                              No activity logs recorded yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* Feedback Responses Queue */}
            <div className="col-lg-5">
              <div className="card shadow-sm border-0 h-100 overflow-hidden">
                <div className="card-header py-3 bg-dark text-white d-flex align-items-center justify-content-between">
                  <h6 className="mb-0 fw-bold d-flex align-items-center gap-2">
                    <i className="fas fa-comment-dots text-teal" style={{ color: '#14b8a6' }}></i>
                    <span>User Feedback Queue</span>
                  </h6>
                </div>
                <div className="card-body p-3 d-flex flex-column gap-3">
                  {data.feedbacks.length > 0 ? (
                    data.feedbacks.map((f) => (
                      <div className="p-3 border rounded-3 bg-light" key={f._id}>
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <span className="fw-bold text-dark extra-small">{f.userId?.name || 'User'}</span>
                          <span className="badge bg-warning text-dark extra-small">{f.rating} / 5 ★</span>
                        </div>
                        <p className="text-secondary extra-small mb-2">{f.comments || f.message}</p>

                        {f.adminResponse ? (
                          <div className="p-2 bg-white border rounded extra-small text-muted mb-0">
                            <strong>Response:</strong> {f.adminResponse}
                          </div>
                        ) : (
                          <form onSubmit={(e) => handleReplySubmit(e, f._id)}>
                            <div className="input-group input-group-sm">
                              <input
                                type="text"
                                className="form-control"
                                placeholder="Type reply..."
                                value={replyText[f._id] || ''}
                                onChange={(e) => handleReplyChange(f._id, e.target.value)}
                                required
                              />
                              <button className="btn btn-primary" type="submit">Reply</button>
                            </div>
                          </form>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-muted my-auto">
                      <i className="fas fa-check-circle fs-3 mb-2 text-success"></i>
                      <p className="mb-0 extra-small">All feedback has been reviewed</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminDashboard;
