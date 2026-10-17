import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const AdminUsers = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    fetchUsers(1, search);
  }, []);

  const fetchUsers = async (page = 1, searchQuery = search) => {
    try {
      setLoading(true);
      const res = await adminAPI.getUsers(page, searchQuery);
      if (res.data.success) {
        setUsers(res.data.users || []);
        setPagination(res.data.pagination || { page: 1, totalPages: 1, total: 0 });
      } else {
        setErrorMsg(res.data.message || 'Failed to fetch users.');
      }
    } catch (err) {
      console.error('Fetch users error:', err);
      setErrorMsg('Failed to load users list.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchUsers(1, search);
  };

  const handleDeleteUser = async (id) => {
    if (id === currentUser?.id) {
      alert('Cannot delete currently logged in administrator.');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    try {
      const res = await adminAPI.deleteUser(id);
      if (res.data.success) {
        setSuccessMsg('User deleted successfully.');
        fetchUsers(pagination.page, search);
      } else {
        setErrorMsg(res.data.message || 'Failed to delete user.');
      }
    } catch (err) {
      console.error('Delete user error:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to delete user.');
    }
  };

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h2 className="fw-extrabold text-dark mb-1 d-flex align-items-center gap-2">
            <i className="fas fa-users text-teal" style={{ color: '#14b8a6' }}></i>
            <span>User Management</span>
          </h2>
          <p className="text-muted small mb-0">
            Manage registered system users, assign admin roles, and update account statuses.
          </p>
        </div>
        <Link to="/admin/users/create" className="btn btn-success btn-sm d-inline-flex align-items-center gap-2 shadow-sm">
          <i className="fas fa-plus"></i> Add New User
        </Link>
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

      <form className="row g-2 mb-4" onSubmit={handleSearchSubmit}>
        <div className="col-md-5 col-lg-4">
          <div className="input-group">
            <input
              type="text"
              name="search"
              className="form-control"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button className="btn btn-primary px-3" type="submit">
              <i className="fas fa-search"></i>
            </button>
          </div>
        </div>
      </form>

      {loading ? (
        <div className="d-flex justify-content-center py-5">
          <div className="spinner-border text-teal" role="status">
            <span className="visually-hidden">Loading users...</span>
          </div>
        </div>
      ) : (
        <div className="card shadow-sm border-0 mb-4 overflow-hidden">
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-dark text-uppercase extra-small">
                  <tr>
                    <th className="ps-4">#</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th className="text-end pe-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length > 0 ? (
                    users.map((u, i) => (
                      <tr key={u._id}>
                        <td className="ps-4 fw-bold text-muted">
                          {(pagination.page - 1) * 10 + i + 1}
                        </td>
                        <td className="fw-bold text-dark">
                          <i className="fas fa-user-circle text-teal me-2" style={{ color: '#14b8a6' }}></i>
                          {u.name}
                        </td>
                        <td className="text-secondary">{u.email}</td>
                        <td>
                          {u.role === 'admin' ? (
                            <span className="badge bg-warning text-dark">
                              <i className="fas fa-user-shield me-1"></i>Admin
                            </span>
                          ) : (
                            <span className="badge bg-info text-white">
                              <i className="fas fa-user me-1"></i>User
                            </span>
                          )}
                        </td>
                        <td>
                          {u.status === 'active' ? (
                            <span className="badge bg-success-subtle text-success border border-success-subtle px-2.5 py-1">
                              <i className="fas fa-check-circle me-1"></i>Active
                            </span>
                          ) : (
                            <span className="badge bg-secondary-subtle text-secondary border border-secondary-subtle px-2.5 py-1">
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="text-muted extra-small">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                        <td className="text-end pe-4">
                          <Link
                            to={`/admin/users/edit/${u._id}`}
                            className="btn btn-sm btn-outline-primary me-1"
                            title="Edit User"
                          >
                            <i className="fas fa-edit"></i>
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(u._id)}
                            className="btn btn-sm btn-outline-danger"
                            title="Delete User"
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="text-center py-5 text-muted">
                        No registered users found matching query.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {pagination.totalPages > 1 && (
        <nav className="mt-4">
          <ul className="pagination justify-content-center">
            <li className={`page-item ${pagination.page <= 1 ? 'disabled' : ''}`}>
              <button
                className="page-link"
                onClick={() => fetchUsers(pagination.page - 1, search)}
              >
                Previous
              </button>
            </li>
            {Array.from({ length: pagination.totalPages }, (_, idx) => idx + 1).map((p) => (
              <li key={p} className={`page-item ${pagination.page === p ? 'active' : ''}`}>
                <button
                  className="page-link"
                  onClick={() => fetchUsers(p, search)}
                >
                  {p}
                </button>
              </li>
            ))}
            <li className={`page-item ${pagination.page >= pagination.totalPages ? 'disabled' : ''}`}>
              <button
                className="page-link"
                onClick={() => fetchUsers(pagination.page + 1, search)}
              >
                Next
              </button>
            </li>
          </ul>
        </nav>
      )}

      <Link to="/admin" className="btn btn-outline-secondary btn-sm mb-4">
        <i className="fas fa-arrow-left me-1"></i> Back to Dashboard
      </Link>
    </div>
  );
};

export default AdminUsers;
