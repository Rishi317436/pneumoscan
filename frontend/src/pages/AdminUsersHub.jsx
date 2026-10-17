import React, { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { SkeletonTableRow } from '../components/common/SkeletonLoader';
import PneumoniaVsNormalChart from '../components/common/PneumoniaVsNormalChart';

const AdminUsersHub = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const { addToast } = useToast();

  useEffect(() => {
    fetchUsers(1, search);
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const res = await adminAPI.getDashboard();
      if (res.data.success) {
        setDashboardData(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUsers = async (page = 1, query = search) => {
    try {
      setLoading(true);
      const res = await adminAPI.getUsers(page, query);
      if (res.data.success) {
        setUsers(res.data.users || []);
        setPagination(res.data.pagination || { page: 1, totalPages: 1, total: 0 });
      }
    } catch (err) {
      console.error('Fetch users error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (id === currentUser?.id) {
      addToast('Cannot delete currently authenticated administrator.', 'warning');
      return;
    }
    if (!window.confirm(`Delete user '${name}'?`)) return;

    try {
      await adminAPI.deleteUser(id);
      addToast(`User '${name}' deleted successfully.`, 'success');
      fetchUsers(pagination.page, search);
    } catch (err) {
      console.error('Delete user error:', err);
      addToast('Failed to delete user.', 'error');
    }
  };

  return (
    <div className="container-fluid py-4 px-lg-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-extrabold text-white mb-1 d-flex align-items-center gap-2">
            <i className="fas fa-users-cog text-cyan" style={{ color: 'var(--rad-cyan)' }}></i>
            <span>Clinician User Registry</span>
          </h2>
          <p className="text-secondary small mb-0">
            Manage authenticated clinicians, roles, and authorization levels.
          </p>
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
          isLoading={!dashboardData}
          onRefresh={fetchDashboardStats}
        />
      </div>

      <div className="rad-card overflow-hidden">
        <div className="rad-card-header">
          <span className="fw-bold text-white small text-uppercase">
            <i className="fas fa-users me-2 text-cyan" style={{ color: 'var(--rad-cyan)' }}></i>
            Registered Users ({pagination.total})
          </span>
          <span className="text-secondary extra-small font-monospace">Page {pagination.page} of {pagination.totalPages}</span>
        </div>

        <div className="rad-card-body p-0">
          <div className="table-responsive">
            <table className="table table-dark table-hover align-middle mb-0 extra-small font-monospace">
              <thead>
                <tr className="border-bottom border-secondary border-opacity-25 text-muted text-uppercase">
                  <th className="ps-3 py-3">Clinician Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Registered</th>
                  <th className="text-end pe-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => <SkeletonTableRow key={i} cols={6} />)
                ) : users.length > 0 ? (
                  users.map((u) => (
                    <tr key={u._id} className="border-bottom border-secondary border-opacity-10">
                      <td className="ps-3 fw-bold text-white">
                        <i className="fas fa-user-md me-2 text-cyan" style={{ color: 'var(--rad-cyan)' }}></i>
                        {u.name}
                      </td>
                      <td className="text-secondary">{u.email}</td>
                      <td>
                        <span className={`badge ${u.role === 'admin' ? 'bg-warning text-dark' : 'bg-info text-white'}`}>
                          {u.role.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${u.status === 'active' ? 'rad-badge-normal' : 'rad-badge-disagree'}`}>
                          {u.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="text-secondary">{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td className="text-end pe-3">
                        <button
                          onClick={() => handleDelete(u._id, u.name)}
                          className="rad-btn-danger btn-sm p-1 px-2.5 extra-small"
                          title="Delete user"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="text-center py-5 text-muted">No users found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminUsersHub;
