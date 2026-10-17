import React, { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import PneumoniaVsNormalChart from '../components/common/PneumoniaVsNormalChart';

const AdminHub = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { addToast } = useToast();

  // Tab 1: Dashboard State
  const [dashboardData, setDashboardData] = useState(null);
  const [loadingDashboard, setLoadingDashboard] = useState(true);

  // Tab 2: User Management State
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [userPage, setUserPage] = useState(1);
  const [userPagination, setUserPagination] = useState({ total: 0, totalPages: 1 });
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState({ name: '', email: '', password: '', role: 'user', status: 'active', registrationNumber: '' });
  const [selectedUserScans, setSelectedUserScans] = useState(null);
  const [viewingUserScansModal, setViewingUserScansModal] = useState(false);

  // Tab 3: Scan Management State
  const [scans, setScans] = useState([]);
  const [scanSearch, setScanSearch] = useState('');
  const [scanPredFilter, setScanPredFilter] = useState('');
  const [scanStatusFilter, setScanStatusFilter] = useState('');
  const [scanPage, setScanPage] = useState(1);
  const [scanPagination, setScanPagination] = useState({ total: 0, totalPages: 1 });
  const [loadingScans, setLoadingScans] = useState(false);
  const [retentionDays, setRetentionDays] = useState(90);

  // Tab 4: Reports Management State
  const [reports, setReports] = useState([]);
  const [reportSearch, setReportSearch] = useState('');
  const [reportPage, setReportPage] = useState(1);
  const [reportPagination, setReportPagination] = useState({ total: 0, totalPages: 1 });
  const [loadingReports, setLoadingReports] = useState(false);

  // Tab 5: Activity Logs State
  const [logs, setLogs] = useState([]);
  const [logSearch, setLogSearch] = useState('');
  const [logActionFilter, setLogActionFilter] = useState('');
  const [logPage, setLogPage] = useState(1);
  const [logPagination, setLogPagination] = useState({ total: 0, totalPages: 1 });
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Tab 6: Feedback State
  const [feedbacks, setFeedbacks] = useState([]);
  const [feedbackStatusFilter, setFeedbackStatusFilter] = useState('');
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(false);
  const [replyText, setReplyText] = useState({});

  // Tab 7: System Settings State
  const [settings, setSettings] = useState({
    allowedImageFormats: ['image/jpeg', 'image/png', 'image/jpg', 'application/dicom'],
    maxUploadSizeMB: 25,
    modelThreshold: 0.5,
    sessionSecurityTimeoutHours: 24,
    emailNotificationsEnabled: true,
    scanRetentionDays: 365,
    autoPurgeEnabled: false
  });
  const [loadingSettings, setLoadingSettings] = useState(false);

  // --- Fetchers ---
  const fetchDashboard = async () => {
    try {
      setLoadingDashboard(true);
      const res = await adminAPI.getDashboard();
      if (res.data.success) {
        setDashboardData(res.data);
      }
    } catch (err) {
      console.error(err);
      addToast('Failed to load dashboard metrics', 'error');
    } finally {
      setLoadingDashboard(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const res = await adminAPI.getUsers(userPage, userSearch);
      if (res.data.success) {
        setUsers(res.data.users);
        setUserPagination(res.data.pagination);
      }
    } catch (err) {
      console.error(err);
      addToast('Failed to load users', 'error');
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchScans = async () => {
    try {
      setLoadingScans(true);
      const res = await adminAPI.getAllScans(scanPage, scanSearch, scanPredFilter, scanStatusFilter);
      if (res.data.success) {
        setScans(res.data.scans);
        setScanPagination(res.data.pagination);
      }
    } catch (err) {
      console.error(err);
      addToast('Failed to load scans', 'error');
    } finally {
      setLoadingScans(false);
    }
  };

  const fetchReports = async () => {
    try {
      setLoadingReports(true);
      const res = await adminAPI.getAllReports(reportPage, reportSearch);
      if (res.data.success) {
        setReports(res.data.reports);
        setReportPagination(res.data.pagination);
      }
    } catch (err) {
      console.error(err);
      addToast('Failed to load reports', 'error');
    } finally {
      setLoadingReports(false);
    }
  };

  const fetchLogs = async () => {
    try {
      setLoadingLogs(true);
      const res = await adminAPI.getActivityLogs(logPage, logSearch, logActionFilter);
      if (res.data.success) {
        setLogs(res.data.logs);
        setLogPagination(res.data.pagination);
      }
    } catch (err) {
      console.error(err);
      addToast('Failed to load audit logs', 'error');
    } finally {
      setLoadingLogs(false);
    }
  };

  const fetchFeedbacks = async () => {
    try {
      setLoadingFeedbacks(true);
      const res = await adminAPI.getFeedbacks(feedbackStatusFilter);
      if (res.data.success) {
        setFeedbacks(res.data.feedbacks);
      }
    } catch (err) {
      console.error(err);
      addToast('Failed to load feedback', 'error');
    } finally {
      setLoadingFeedbacks(false);
    }
  };

  const fetchSettings = async () => {
    try {
      setLoadingSettings(true);
      const res = await adminAPI.getSettings();
      if (res.data.success && res.data.settings) {
        setSettings(res.data.settings);
      }
    } catch (err) {
      console.error(err);
      addToast('Failed to load settings', 'error');
    } finally {
      setLoadingSettings(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'dashboard') fetchDashboard();
    if (activeTab === 'users') {
      fetchUsers();
      if (!dashboardData) fetchDashboard();
    }
    if (activeTab === 'scans') fetchScans();
    if (activeTab === 'reports') fetchReports();
    if (activeTab === 'logs') fetchLogs();
    if (activeTab === 'feedback') fetchFeedbacks();
    if (activeTab === 'settings') fetchSettings();
  }, [activeTab]);

  // Trigger users fetch on filter change
  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
  }, [userPage]);

  // Trigger scans fetch on filter change
  useEffect(() => {
    if (activeTab === 'scans') fetchScans();
  }, [scanPage, scanPredFilter, scanStatusFilter]);

  // User Actions
  const handleSaveUser = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await adminAPI.updateUser(editingUser._id, userForm);
        addToast(`User ${userForm.name} updated successfully`, 'success');
      } else {
        await adminAPI.createUser(userForm);
        addToast(`User ${userForm.name} created successfully`, 'success');
      }
      setUserModalOpen(false);
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to save user', 'error');
    }
  };

  const handleToggleUserStatus = async (user) => {
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    try {
      await adminAPI.updateUser(user._id, { status: newStatus });
      addToast(`User set to ${newStatus}`, 'info');
      fetchUsers();
    } catch (err) {
      addToast('Failed to change user status', 'error');
    }
  };

  const handleDeleteUser = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete user '${name}'?`)) return;
    try {
      await adminAPI.deleteUser(id);
      addToast(`User ${name} removed`, 'success');
      fetchUsers();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to delete user', 'error');
    }
  };

  const handleViewUserScans = async (userId, name) => {
    try {
      const res = await adminAPI.getUserScans(userId);
      if (res.data.success) {
        setSelectedUserScans({ name, scans: res.data.scans });
        setViewingUserScansModal(true);
      }
    } catch (err) {
      addToast('Failed to load user scan history', 'error');
    }
  };

  // Scan Actions
  const handleDeleteScan = async (id, filename) => {
    if (!window.confirm(`Delete scan '${filename}' and its detections?`)) return;
    try {
      await adminAPI.deleteScan(id);
      addToast(`Scan ${filename} deleted`, 'success');
      fetchScans();
    } catch (err) {
      addToast('Failed to delete scan', 'error');
    }
  };

  const handlePurgeRetention = async () => {
    if (!window.confirm(`Purge all scan records older than ${retentionDays} days? This cannot be undone.`)) return;
    try {
      const res = await adminAPI.applyScanRetention(retentionDays);
      addToast(res.data.message || 'Retention policy executed', 'success');
      fetchScans();
    } catch (err) {
      addToast('Failed to purge records', 'error');
    }
  };

  // Report Actions
  const handleRegenerateReport = async (id) => {
    try {
      const res = await adminAPI.regenerateReport(id);
      addToast('Report regenerated successfully', 'success');
      fetchReports();
    } catch (err) {
      addToast('Failed to regenerate report', 'error');
    }
  };

  const handleDeleteReport = async (id) => {
    if (!window.confirm('Delete this clinical report?')) return;
    try {
      await adminAPI.deleteReport(id);
      addToast('Report deleted', 'success');
      fetchReports();
    } catch (err) {
      addToast('Failed to delete report', 'error');
    }
  };

  // Feedback Action
  const handleRespondFeedback = async (id) => {
    const text = replyText[id];
    if (!text || !text.trim()) {
      addToast('Please enter a response message', 'warning');
      return;
    }
    try {
      await adminAPI.respondFeedback(id, text);
      addToast('Response submitted and marked resolved', 'success');
      setReplyText(prev => ({ ...prev, [id]: '' }));
      fetchFeedbacks();
    } catch (err) {
      addToast('Failed to respond to feedback', 'error');
    }
  };

  // Settings Action
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      await adminAPI.updateSettings(settings);
      addToast('System settings updated successfully', 'success');
    } catch (err) {
      addToast('Failed to update system settings', 'error');
    }
  };

  return (
    <div className="container-fluid py-4 px-lg-4">
      {/* Top Header */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h2 className="fw-extrabold text-white mb-1 d-flex align-items-center gap-2">
            <i className="fas fa-shield-alt text-warning"></i>
            <span>Chest X-Ray Administration Hub</span>
          </h2>
          <p className="text-secondary small mb-0">
            Enterprise system telemetry, user roles, scan retention, audit logging, and clinical settings.
          </p>
        </div>
      </div>

      {/* Modern 7-Tab Navigation */}
      <div className="d-flex gap-2 mb-4 border-bottom border-secondary border-opacity-25 pb-3 overflow-auto">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`glass-btn small ${activeTab === 'dashboard' ? 'active' : ''}`}
        >
          <i className="fas fa-tachometer-alt me-1.5"></i> 1. Dashboard
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`glass-btn small ${activeTab === 'users' ? 'active' : ''}`}
        >
          <i className="fas fa-users-cog me-1.5"></i> 2. User Management
        </button>
        <button
          onClick={() => setActiveTab('scans')}
          className={`glass-btn small ${activeTab === 'scans' ? 'active' : ''}`}
        >
          <i className="fas fa-x-ray me-1.5"></i> 3. X-Ray Scans
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`glass-btn small ${activeTab === 'reports' ? 'active' : ''}`}
        >
          <i className="fas fa-file-medical me-1.5"></i> 4. Reports
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`glass-btn small ${activeTab === 'logs' ? 'active' : ''}`}
        >
          <i className="fas fa-history me-1.5"></i> 5. Activity Logs
        </button>
        <button
          onClick={() => setActiveTab('feedback')}
          className={`glass-btn small ${activeTab === 'feedback' ? 'active' : ''}`}
        >
          <i className="fas fa-comments me-1.5"></i> 6. Feedback
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`glass-btn small ${activeTab === 'settings' ? 'active' : ''}`}
        >
          <i className="fas fa-sliders-h me-1.5"></i> 7. System Settings
        </button>
      </div>

      {/* ================= TAB 1: ADMIN DASHBOARD ================= */}
      {activeTab === 'dashboard' && (
        <div>
          {loadingDashboard ? (
            <div className="text-center py-5">
              <div className="spinner-border text-info" role="status"></div>
            </div>
          ) : (
            <>
              {/* Stat Cards */}
              <div className="row g-3 mb-4">
                <div className="col-md-3">
                  <div className="rad-card p-3 border-start border-4 border-info">
                    <span className="text-muted extra-small text-uppercase fw-bold">Total Registered Users</span>
                    <h3 className="fw-extrabold text-white my-1">{dashboardData?.stats?.users || 0}</h3>
                    <small className="text-secondary extra-small">Clinicians and Chest X-Ray Specialists</small>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="rad-card p-3 border-start border-4 border-primary">
                    <span className="text-muted extra-small text-uppercase fw-bold">Total X-Rays Analyzed</span>
                    <h3 className="fw-extrabold text-white my-1">{dashboardData?.stats?.scans || 0}</h3>
                    <small className="text-secondary extra-small">Chest X-Rays ingested</small>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="rad-card p-3 border-start border-4 border-danger">
                    <span className="text-muted extra-small text-uppercase fw-bold">Pneumonia Pattern</span>
                    <h3 className="fw-extrabold text-danger my-1">{dashboardData?.stats?.pneumoniaDetected || 0}</h3>
                    <small className="text-secondary extra-small">DenseNet + DIP Positives</small>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="rad-card p-3 border-start border-4 border-success">
                    <span className="text-muted extra-small text-uppercase fw-bold">Normal / Clear Scans</span>
                    <h3 className="fw-extrabold text-success my-1">{dashboardData?.stats?.normalPattern || 0}</h3>
                    <small className="text-secondary extra-small">Unremarkable parenchyma</small>
                  </div>
                </div>
              </div>

              {/* Pneumonia vs Normal Results Graph */}
              <div className="mb-4">
                <PneumoniaVsNormalChart
                  pneumoniaCount={dashboardData?.stats?.pneumoniaDetected || 0}
                  normalCount={dashboardData?.stats?.normalPattern || 0}
                  unknownCount={dashboardData?.stats?.unknownCount || 0}
                  totalAnalyses={dashboardData?.stats?.completedAnalyses || 0}
                  earliestDate={dashboardData?.stats?.earliestDate}
                  latestDate={dashboardData?.stats?.latestDate}
                  isLoading={loadingDashboard}
                  onRefresh={fetchDashboard}
                />
              </div>

              {/* Service Health & Recent Activity */}
              <div className="row g-4">
                <div className="col-lg-5">
                  <div className="rad-card p-4 h-100">
                    <h6 className="fw-bold text-white mb-3 d-flex align-items-center gap-2">
                      <i className="fas fa-server text-cyan"></i> API & Model Service Status
                    </h6>
                    <div className="list-group list-group-flush bg-transparent">
                      <div className="list-group-item bg-transparent border-secondary border-opacity-25 px-0 d-flex justify-content-between align-items-center">
                        <div>
                          <strong className="text-white small d-block">{dashboardData?.serviceStatus?.api?.name}</strong>
                          <span className="text-secondary extra-small">
                            Uptime: {dashboardData?.serviceStatus?.api?.uptime} &bull; Memory: {dashboardData?.serviceStatus?.api?.memory}
                          </span>
                        </div>
                        <span className="badge bg-success-subtle text-success">OPERATIONAL</span>
                      </div>
                      <div className="list-group-item bg-transparent border-secondary border-opacity-25 px-0 d-flex justify-content-between align-items-center">
                        <div>
                          <strong className="text-white small d-block">{dashboardData?.serviceStatus?.database?.name}</strong>
                          <span className="text-secondary extra-small">Host: {dashboardData?.serviceStatus?.database?.host}</span>
                        </div>
                        <span className="badge bg-success-subtle text-success">CONNECTED</span>
                      </div>
                      <div className="list-group-item bg-transparent border-secondary border-opacity-25 px-0 d-flex justify-content-between align-items-center">
                        <div>
                          <strong className="text-white small d-block">{dashboardData?.serviceStatus?.modelInference?.name}</strong>
                          <span className="text-secondary extra-small">WSL2 Python 3.12 Virtual Environment</span>
                        </div>
                        <span className="badge bg-success-subtle text-success">ONLINE</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-lg-7">
                  <div className="rad-card p-4 h-100">
                    <h6 className="fw-bold text-white mb-3 d-flex align-items-center gap-2">
                      <i className="fas fa-stream text-cyan"></i> Recent System Activity
                    </h6>
                    <div className="table-responsive">
                      <table className="table table-dark table-hover table-sm extra-small mb-0">
                        <thead>
                          <tr className="text-muted">
                            <th>Timestamp</th>
                            <th>User</th>
                            <th>Action</th>
                            <th>Details</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dashboardData?.recentLogs?.map((log) => (
                            <tr key={log._id}>
                              <td className="text-secondary font-monospace">{new Date(log.createdAt).toLocaleTimeString()}</td>
                              <td className="text-white fw-semibold">{log.userId?.name || 'System'}</td>
                              <td><span className="badge bg-secondary-subtle text-secondary">{log.action}</span></td>
                              <td className="text-secondary text-truncate" style={{ maxWidth: '200px' }}>{log.details}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ================= TAB 2: USER MANAGEMENT ================= */}
      {activeTab === 'users' && (
        <div>
          {/* User Analysis Outcome Distribution Graph */}
          <div className="mb-4">
            <PneumoniaVsNormalChart
              pneumoniaCount={dashboardData?.stats?.pneumoniaDetected || 0}
              normalCount={dashboardData?.stats?.normalPattern || 0}
              unknownCount={dashboardData?.stats?.unknownCount || 0}
              totalAnalyses={dashboardData?.stats?.completedAnalyses || 0}
              earliestDate={dashboardData?.stats?.earliestDate}
              latestDate={dashboardData?.stats?.latestDate}
              isLoading={loadingDashboard}
              onRefresh={fetchDashboard}
            />
          </div>

          <div className="rad-card p-4">
            <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
              <h5 className="fw-bold text-white mb-0">Registered Clinicians & Administrators</h5>
            <div className="d-flex gap-2">
              <input
                type="text"
                placeholder="Search by name, email, reg no..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
                className="form-control form-control-sm"
                style={{ width: '260px' }}
              />
              <button onClick={() => { setEditingUser(null); setUserForm({ name: '', email: '', password: '', role: 'user', status: 'active', registrationNumber: '' }); setUserModalOpen(true); }} className="rad-btn-primary btn-sm">
                <i className="fas fa-user-plus me-1"></i> Add Account
              </button>
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-dark table-hover align-middle mb-0">
              <thead>
                <tr className="text-muted extra-small">
                  <th>Reg No</th>
                  <th>Clinician</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Registered</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id}>
                    <td className="font-monospace text-cyan small">{u.registrationNumber || 'RAD-0000'}</td>
                    <td className="fw-bold text-white">{u.name}</td>
                    <td className="text-secondary small">{u.email}</td>
                    <td>
                      <span className={`badge ${u.role === 'admin' ? 'bg-warning text-dark' : 'bg-secondary'}`}>
                        {u.role.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${u.status === 'active' ? 'bg-success' : 'bg-danger'}`}>
                        {u.status?.toUpperCase() || 'ACTIVE'}
                      </span>
                    </td>
                    <td className="text-secondary extra-small">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="text-end">
                      <button onClick={() => handleViewUserScans(u._id, u.name)} className="btn btn-sm btn-outline-info me-1" title="Scan History">
                        <i className="fas fa-history"></i>
                      </button>
                      <button onClick={() => handleToggleUserStatus(u)} className={`btn btn-sm ${u.status === 'active' ? 'btn-outline-warning' : 'btn-outline-success'} me-1`} title={u.status === 'active' ? 'Deactivate' : 'Activate'}>
                        <i className={`fas ${u.status === 'active' ? 'fa-user-slash' : 'fa-user-check'}`}></i>
                      </button>
                      <button onClick={() => { setEditingUser(u); setUserForm({ name: u.name, email: u.email, role: u.role, status: u.status || 'active', registrationNumber: u.registrationNumber || '', password: '' }); setUserModalOpen(true); }} className="btn btn-sm btn-outline-light me-1" title="Edit">
                        <i className="fas fa-edit"></i>
                      </button>
                      <button onClick={() => handleDeleteUser(u._id, u.name)} className="btn btn-sm btn-outline-danger" title="Remove">
                        <i className="fas fa-trash-alt"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* User Pagination */}
          <div className="d-flex justify-content-between align-items-center mt-3 pt-3 border-top border-secondary border-opacity-25">
            <span className="text-muted extra-small">Total {userPagination.total} accounts</span>
            <div className="btn-group btn-group-sm">
              <button disabled={userPage <= 1} onClick={() => setUserPage(p => p - 1)} className="btn btn-outline-secondary">Prev</button>
              <button className="btn btn-outline-secondary disabled text-white">{userPage} / {userPagination.totalPages || 1}</button>
              <button disabled={userPage >= userPagination.totalPages} onClick={() => setUserPage(p => p + 1)} className="btn btn-outline-secondary">Next</button>
            </div>
          </div>
        </div>
      </div>
    )}

      {/* User Create/Edit Modal */}
      {userModalOpen && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rad-card p-4">
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title fw-bold text-white">{editingUser ? 'Edit Clinician Account' : 'Create New Account'}</h5>
                <button onClick={() => setUserModalOpen(false)} className="btn-close btn-close-white"></button>
              </div>
              <form onSubmit={handleSaveUser}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label extra-small text-muted text-uppercase fw-bold">Full Name</label>
                    <input type="text" required value={userForm.name} onChange={e => setUserForm({ ...userForm, name: e.target.value })} className="form-control" />
                  </div>
                  <div className="mb-3">
                    <label className="form-label extra-small text-muted text-uppercase fw-bold">Email Address</label>
                    <input type="email" required value={userForm.email} onChange={e => setUserForm({ ...userForm, email: e.target.value })} className="form-control" />
                  </div>
                  <div className="mb-3">
                    <label className="form-label extra-small text-muted text-uppercase fw-bold">Registration Number</label>
                    <input type="text" value={userForm.registrationNumber} onChange={e => setUserForm({ ...userForm, registrationNumber: e.target.value })} placeholder="RAD-XXXX" className="form-control" />
                  </div>
                  <div className="mb-3">
                    <label className="form-label extra-small text-muted text-uppercase fw-bold">
                      {editingUser ? 'New Password (leave blank to keep unchanged)' : 'Password'}
                    </label>
                    <input type="password" required={!editingUser} value={userForm.password} onChange={e => setUserForm({ ...userForm, password: e.target.value })} className="form-control" />
                  </div>
                  <div className="row g-2">
                    <div className="col-6">
                      <label className="form-label extra-small text-muted text-uppercase fw-bold">Role</label>
                      <select value={userForm.role} onChange={e => setUserForm({ ...userForm, role: e.target.value })} className="form-select">
                        <option value="user">Clinician (User)</option>
                        <option value="admin">Administrator</option>
                      </select>
                    </div>
                    <div className="col-6">
                      <label className="form-label extra-small text-muted text-uppercase fw-bold">Account Status</label>
                      <select value={userForm.status} onChange={e => setUserForm({ ...userForm, status: e.target.value })} className="form-select">
                        <option value="active">Active</option>
                        <option value="inactive">Deactivated</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="modal-footer border-0 pt-0">
                  <button type="button" onClick={() => setUserModalOpen(false)} className="btn btn-secondary btn-sm">Cancel</button>
                  <button type="submit" className="rad-btn-primary btn-sm">Save Changes</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* User Scans Modal */}
      {viewingUserScansModal && selectedUserScans && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1050 }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content rad-card p-4">
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title fw-bold text-white">Scan History: {selectedUserScans.name}</h5>
                <button onClick={() => setViewingUserScansModal(false)} className="btn-close btn-close-white"></button>
              </div>
              <div className="modal-body">
                {selectedUserScans.scans.length === 0 ? (
                  <p className="text-secondary text-center py-4 mb-0">No scans submitted by this clinician.</p>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-dark table-sm extra-small mb-0">
                      <thead>
                        <tr className="text-muted">
                          <th>Date</th>
                          <th>Filename</th>
                          <th>Prediction</th>
                          <th>Confidence</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedUserScans.scans.map(s => (
                          <tr key={s._id}>
                            <td className="text-secondary font-monospace">{new Date(s.createdAt).toLocaleDateString()}</td>
                            <td className="text-white font-monospace">{s.filename}</td>
                            <td>
                              <span className={`badge ${s.detection?.mlDetection?.prediction === 'PNEUMONIA' ? 'bg-danger' : 'bg-success'}`}>
                                {s.detection?.mlDetection?.prediction || 'PENDING'}
                              </span>
                            </td>
                            <td className="text-info font-monospace">
                              {s.detection?.mlDetection?.confidence ? `${(s.detection.mlDetection.confidence * 100).toFixed(1)}%` : '-'}
                            </td>
                            <td><span className="badge bg-secondary">{s.status}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className="modal-footer border-0 pt-0">
                <button type="button" onClick={() => setViewingUserScansModal(false)} className="btn btn-secondary btn-sm">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 3: X-RAY SCAN MANAGEMENT ================= */}
      {activeTab === 'scans' && (
        <div className="rad-card p-4">
          <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
            <div>
              <h5 className="fw-bold text-white mb-0">X-Ray Studies & Image Storage Management</h5>
              <p className="text-secondary extra-small mb-0">Search submitted studies, inspect failed processing, and enforce retention policies.</p>
            </div>
            {/* Retention Policy Controls */}
            <div className="d-flex align-items-center gap-2 p-2 rounded-3 glass-item border border-secondary border-opacity-25">
              <span className="extra-small text-muted fw-bold text-uppercase">Retention:</span>
              <select value={retentionDays} onChange={e => setRetentionDays(Number(e.target.value))} className="form-select form-select-sm" style={{ width: '110px' }}>
                <option value={30}>30 Days</option>
                <option value={60}>60 Days</option>
                <option value={90}>90 Days</option>
                <option value={180}>180 Days</option>
              </select>
              <button onClick={handlePurgeRetention} className="btn btn-sm btn-outline-danger">
                <i className="fas fa-broom me-1"></i> Purge
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="row g-2 mb-3">
            <div className="col-md-5">
              <input
                type="text"
                placeholder="Search by clinician name, email, or filename..."
                value={scanSearch}
                onChange={e => setScanSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && fetchScans()}
                className="form-control form-control-sm"
              />
            </div>
            <div className="col-md-3">
              <select value={scanPredFilter} onChange={e => setScanPredFilter(e.target.value)} className="form-select form-select-sm">
                <option value="">All Diagnostic Calls</option>
                <option value="PNEUMONIA">Pneumonia Only</option>
                <option value="NORMAL">Normal Only</option>
              </select>
            </div>
            <div className="col-md-2">
              <select value={scanStatusFilter} onChange={e => setScanStatusFilter(e.target.value)} className="form-select form-select-sm">
                <option value="">All Statuses</option>
                <option value="processed">Processed</option>
                <option value="processing">Processing</option>
                <option value="failed">Failed / Error</option>
              </select>
            </div>
            <div className="col-md-2">
              <button onClick={fetchScans} className="glass-btn small w-100">
                <i className="fas fa-search me-1"></i> Filter
              </button>
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-dark table-hover align-middle mb-0">
              <thead>
                <tr className="text-muted extra-small">
                  <th>Date</th>
                  <th>Filename</th>
                  <th>Clinician</th>
                  <th>Call</th>
                  <th>Confidence</th>
                  <th>DIP Verdict</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {scans.map((s) => (
                  <tr key={s._id}>
                    <td className="text-secondary font-monospace extra-small">{new Date(s.createdAt).toLocaleDateString()}</td>
                    <td className="font-monospace text-white small">{s.filename}</td>
                    <td className="text-secondary small">{s.userId?.name || 'Unknown'}</td>
                    <td>
                      <span className={`badge ${s.detection?.mlDetection?.prediction === 'PNEUMONIA' ? 'bg-danger' : 'bg-success'}`}>
                        {s.detection?.mlDetection?.prediction || 'PENDING'}
                      </span>
                    </td>
                    <td className="font-monospace text-info small">
                      {s.detection?.mlDetection?.confidence ? `${(s.detection.mlDetection.confidence * 100).toFixed(1)}%` : '-'}
                    </td>
                    <td className="text-secondary extra-small">
                      {s.detection?.manualDetection?.prediction || 'N/A'}
                    </td>
                    <td>
                      <span className={`badge ${s.status === 'processed' ? 'bg-success-subtle text-success' : s.status === 'failed' ? 'bg-danger text-white' : 'bg-warning text-dark'}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="text-end">
                      <button onClick={() => handleDeleteScan(s._id, s.filename)} className="btn btn-sm btn-outline-danger" title="Delete Scan">
                        <i className="fas fa-trash-alt"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Scan Pagination */}
          <div className="d-flex justify-content-between align-items-center mt-3 pt-3 border-top border-secondary border-opacity-25">
            <span className="text-muted extra-small">Total {scanPagination.total} scans</span>
            <div className="btn-group btn-group-sm">
              <button disabled={scanPage <= 1} onClick={() => setScanPage(p => p - 1)} className="btn btn-outline-secondary">Prev</button>
              <button className="btn btn-outline-secondary disabled text-white">{scanPage} / {scanPagination.totalPages || 1}</button>
              <button disabled={scanPage >= scanPagination.totalPages} onClick={() => setScanPage(p => p + 1)} className="btn btn-outline-secondary">Next</button>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 4: REPORTS MANAGEMENT ================= */}
      {activeTab === 'reports' && (
        <div className="rad-card p-4">
          <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
            <div>
              <h5 className="fw-bold text-white mb-0">Clinical Diagnostic Reports</h5>
              <p className="text-secondary extra-small mb-0">Regenerate clinical impressions, inspect generated reports, or purge corrupted records.</p>
            </div>
            <input
              type="text"
              placeholder="Search reports by findings or clinician..."
              value={reportSearch}
              onChange={e => setReportSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchReports()}
              className="form-control form-control-sm bg-dark text-white border-secondary"
              style={{ width: '280px' }}
            />
          </div>

          <div className="table-responsive">
            <table className="table table-dark table-hover align-middle mb-0">
              <thead>
                <tr className="text-muted extra-small">
                  <th>Report ID</th>
                  <th>Created</th>
                  <th>Clinician</th>
                  <th>Findings Summary</th>
                  <th>Format</th>
                  <th>Downloads</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr key={r._id}>
                    <td className="font-monospace text-cyan extra-small">{r._id.slice(-8)}</td>
                    <td className="text-secondary extra-small">{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td className="text-white small">{r.userId?.name || 'System'}</td>
                    <td className="text-secondary small text-truncate" style={{ maxWidth: '320px' }}>
                      {r.findings || 'No recorded findings.'}
                    </td>
                    <td><span className="badge bg-secondary-subtle text-secondary">{r.reportFormat}</span></td>
                    <td className="font-monospace text-info">{r.downloadCount || 0}</td>
                    <td className="text-end">
                      <button onClick={() => handleRegenerateReport(r._id)} className="btn btn-sm btn-outline-warning me-1" title="Regenerate Report">
                        <i className="fas fa-sync-alt"></i>
                      </button>
                      <button onClick={() => handleDeleteReport(r._id)} className="btn btn-sm btn-outline-danger" title="Delete">
                        <i className="fas fa-trash-alt"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Reports Pagination */}
          <div className="d-flex justify-content-between align-items-center mt-3 pt-3 border-top border-secondary border-opacity-25">
            <span className="text-muted extra-small">Total {reportPagination.total} reports</span>
            <div className="btn-group btn-group-sm">
              <button disabled={reportPage <= 1} onClick={() => setReportPage(p => p - 1)} className="btn btn-outline-secondary">Prev</button>
              <button className="btn btn-outline-secondary disabled text-white">{reportPage} / {reportPagination.totalPages || 1}</button>
              <button disabled={reportPage >= reportPagination.totalPages} onClick={() => setReportPage(p => p + 1)} className="btn btn-outline-secondary">Next</button>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 5: ACTIVITY LOGS & AUDIT TRAIL ================= */}
      {activeTab === 'logs' && (
        <div className="rad-card p-4">
          <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
            <div>
              <h5 className="fw-bold text-white mb-0">System Activity Logs & Security Audit Trail</h5>
              <p className="text-secondary extra-small mb-0">Comprehensive record of logins, uploads, model inferences, downloads, and administrative actions.</p>
            </div>
            <div className="d-flex gap-2">
              <input
                type="text"
                placeholder="Search action or details..."
                value={logSearch}
                onChange={e => setLogSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && fetchLogs()}
                className="form-control form-control-sm"
                style={{ width: '220px' }}
              />
              <select value={logActionFilter} onChange={e => { setLogActionFilter(e.target.value); setLogPage(1); }} className="form-select form-select-sm" style={{ width: '150px' }}>
                <option value="">All Events</option>
                <option value="Login">Logins</option>
                <option value="Registration">Registrations</option>
                <option value="Upload">Uploads</option>
                <option value="Admin">Admin Actions</option>
              </select>
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-dark table-hover align-middle mb-0">
              <thead>
                <tr className="text-muted extra-small">
                  <th>Timestamp</th>
                  <th>Event Action</th>
                  <th>Clinician</th>
                  <th>IP Address</th>
                  <th>Outcome / Event Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l._id}>
                    <td className="text-secondary font-monospace extra-small">
                      {new Date(l.createdAt).toLocaleString()}
                    </td>
                    <td>
                      <span className="badge bg-secondary-subtle text-cyan fw-bold">
                        {l.action}
                      </span>
                    </td>
                    <td className="text-white small">
                      {l.userId?.name || 'Anonymous / Guest'}
                    </td>
                    <td className="text-secondary font-monospace extra-small">
                      {l.ipAddress || '127.0.0.1'}
                    </td>
                    <td className="text-secondary small">{l.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Log Pagination */}
          <div className="d-flex justify-content-between align-items-center mt-3 pt-3 border-top border-secondary border-opacity-25">
            <span className="text-muted extra-small">Total {logPagination.total} audit events</span>
            <div className="btn-group btn-group-sm">
              <button disabled={logPage <= 1} onClick={() => setLogPage(p => p - 1)} className="btn btn-outline-secondary">Prev</button>
              <button className="btn btn-outline-secondary disabled text-white">{logPage} / {logPagination.totalPages || 1}</button>
              <button disabled={logPage >= logPagination.totalPages} onClick={() => setLogPage(p => p + 1)} className="btn btn-outline-secondary">Next</button>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 6: FEEDBACK MANAGEMENT ================= */}
      {activeTab === 'feedback' && (
        <div className="rad-card p-4">
          <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
            <div>
              <h5 className="fw-bold text-white mb-0">Clinical User Feedback & Ratings</h5>
              <p className="text-secondary extra-small mb-0">Review ratings, diagnostic discrepancy reports, and send administrative responses.</p>
            </div>
            <select value={feedbackStatusFilter} onChange={e => setFeedbackStatusFilter(e.target.value)} className="form-select form-select-sm" style={{ width: '160px' }}>
              <option value="">All Statuses</option>
              <option value="pending">Pending Only</option>
              <option value="resolved">Resolved Only</option>
            </select>
          </div>

          <div className="space-y-3">
            {feedbacks.map((f) => (
              <div key={f._id} className="p-3 rounded-3 glass-item border border-secondary border-opacity-25 mb-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <div className="d-flex align-items-center gap-2">
                    <strong className="text-white small">{f.userId?.name || 'Clinician'}</strong>
                    <span className="text-warning extra-small">
                      {'★'.repeat(f.rating || 5)}{'☆'.repeat(5 - (f.rating || 5))}
                    </span>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <span className="text-secondary extra-small font-monospace">{new Date(f.createdAt).toLocaleDateString()}</span>
                    <span className={`badge ${f.status === 'resolved' ? 'bg-success' : 'bg-warning text-dark'}`}>
                      {f.status?.toUpperCase()}
                    </span>
                  </div>
                </div>

                <p className="text-secondary small mb-2">{f.comments}</p>

                {f.adminResponse ? (
                  <div className="p-2.5 rounded-3 glass-item border border-secondary border-opacity-25">
                    <small className="text-cyan extra-small fw-bold text-uppercase d-block mb-1">
                      <i className="fas fa-reply me-1"></i> Admin Response
                    </small>
                    <p className="text-white small mb-0">{f.adminResponse}</p>
                  </div>
                ) : (
                  <div className="d-flex gap-2 mt-2">
                    <input
                      type="text"
                      placeholder="Type response to resolve..."
                      value={replyText[f._id] || ''}
                      onChange={e => setReplyText({ ...replyText, [f._id]: e.target.value })}
                      className="form-control form-control-sm"
                    />
                    <button onClick={() => handleRespondFeedback(f._id)} className="glass-btn primary small">
                      Resolve
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= TAB 7: SYSTEM SETTINGS ================= */}
      {activeTab === 'settings' && (
        <div className="rad-card p-4">
          <h5 className="fw-bold text-white mb-1">Application Configuration & Security Settings</h5>
          <p className="text-secondary extra-small mb-4">Manage file upload bounds, neural thresholds, session timeout, and database connectivity.</p>

          <form onSubmit={handleSaveSettings}>
            <div className="row g-4 mb-4">
              <div className="col-md-6">
                <div className="p-3 rounded bg-dark border border-secondary border-opacity-25 h-100">
                  <h6 className="fw-bold text-white mb-3">Upload & File Processing</h6>
                  <div className="mb-3">
                    <label className="form-label extra-small text-muted text-uppercase fw-bold">Maximum Chest X-Ray Upload Size (MB)</label>
                    <input
                      type="number"
                      value={settings.maxUploadSizeMB}
                      onChange={e => setSettings({ ...settings, maxUploadSizeMB: Number(e.target.value) })}
                      className="form-control form-control-sm bg-surface text-white border-secondary"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label extra-small text-muted text-uppercase fw-bold">Allowed MIME Formats</label>
                    <input
                      type="text"
                      value={settings.allowedImageFormats.join(', ')}
                      onChange={e => setSettings({ ...settings, allowedImageFormats: e.target.value.split(',').map(s => s.trim()) })}
                      className="form-control form-control-sm bg-surface text-white border-secondary"
                    />
                    <small className="text-muted extra-small">Comma separated (e.g. image/jpeg, image/png, application/dicom)</small>
                  </div>
                </div>
              </div>

              <div className="col-md-6">
                <div className="p-3 rounded bg-dark border border-secondary border-opacity-25 h-100">
                  <h6 className="fw-bold text-white mb-3">Session Security & Retention</h6>
                  <div className="mb-3">
                    <label className="form-label extra-small text-muted text-uppercase fw-bold">Session Security Timeout (Hours)</label>
                    <input
                      type="number"
                      value={settings.sessionSecurityTimeoutHours}
                      onChange={e => setSettings({ ...settings, sessionSecurityTimeoutHours: Number(e.target.value) })}
                      className="form-control form-control-sm bg-surface text-white border-secondary"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label extra-small text-muted text-uppercase fw-bold">Global Scan Retention (Days)</label>
                    <input
                      type="number"
                      value={settings.scanRetentionDays}
                      onChange={e => setSettings({ ...settings, scanRetentionDays: Number(e.target.value) })}
                      className="form-control form-control-sm bg-surface text-white border-secondary"
                    />
                  </div>
                </div>
              </div>
            </div>

            <button type="submit" className="rad-btn-primary py-2 px-4 fw-bold">
              <i className="fas fa-save me-1.5"></i> Save System Configuration
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminHub;
