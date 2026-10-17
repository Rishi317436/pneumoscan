import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { adminAPI } from '../services/api';

const AdminUserForm = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    dob: '',
    gender: 'Male',
    role: 'user',
    status: 'active'
  });

  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isEdit) {
      fetchUser();
    }
  }, [id]);

  const fetchUser = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getUserById(id);
      if (res.data.success && res.data.user) {
        const u = res.data.user;
        setFormData({
          name: u.name || '',
          email: u.email || '',
          password: '',
          phone: u.phone || '',
          dob: u.dob ? new Date(u.dob).toISOString().split('T')[0] : '',
          gender: u.gender || 'Male',
          role: u.role || 'user',
          status: u.status || 'active'
        });
      } else {
        setErrorMsg(res.data.message || 'Failed to load user.');
      }
    } catch (err) {
      console.error('Fetch user error:', err);
      setErrorMsg('Failed to load user data.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);

    try {
      let res;
      if (isEdit) {
        res = await adminAPI.updateUser(id, formData);
      } else {
        res = await adminAPI.createUser(formData);
      }

      if (res.data.success) {
        navigate('/admin/users');
      } else {
        setErrorMsg(res.data.message || 'Operation failed.');
      }
    } catch (err) {
      console.error('Save user error:', err);
      setErrorMsg(err.response?.data?.message || 'Error occurred while saving user.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-teal" role="status">
          <span className="visually-hidden">Loading form...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <div className="row justify-content-center">
        <div className="col-md-8">
          <div className="card shadow">
            <div className="card-header bg-primary text-white">
              <h4 className="mb-0">
                <i className={`fas fa-user-${isEdit ? 'edit' : 'plus'} me-2`}></i>
                {isEdit ? 'Edit' : 'Create'} User
              </h4>
            </div>
            <div className="card-body p-4">
              {errorMsg && (
                <div className="alert alert-danger alert-dismissible fade show shadow-sm border-0 mb-4">
                  <i className="fas fa-exclamation-triangle me-2"></i>
                  {errorMsg}
                  <button type="button" className="btn-close" onClick={() => setErrorMsg('')}></button>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label fw-semibold">
                      Name <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      className="form-control"
                      value={formData.name}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label fw-semibold">
                      Email <span className="text-danger">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      className="form-control"
                      value={formData.email}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label fw-semibold">
                      Password {isEdit ? '(leave blank to keep current)' : ''}{' '}
                      {!isEdit && <span className="text-danger">*</span>}
                    </label>
                    <input
                      type="password"
                      name="password"
                      className="form-control"
                      value={formData.password}
                      onChange={handleChange}
                      required={!isEdit}
                      minLength={6}
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label fw-semibold">Phone</label>
                    <input
                      type="text"
                      name="phone"
                      className="form-control"
                      value={formData.phone}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-3 mb-3">
                    <label className="form-label fw-semibold">DOB</label>
                    <input
                      type="date"
                      name="dob"
                      className="form-control"
                      value={formData.dob}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="col-md-3 mb-3">
                    <label className="form-label fw-semibold">Gender</label>
                    <select
                      name="gender"
                      className="form-select"
                      value={formData.gender}
                      onChange={handleChange}
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="col-md-3 mb-3">
                    <label className="form-label fw-semibold">Role</label>
                    <select
                      name="role"
                      className="form-select"
                      value={formData.role}
                      onChange={handleChange}
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div className="col-md-3 mb-3">
                    <label className="form-label fw-semibold">Status</label>
                    <select
                      name="status"
                      className="form-select"
                      value={formData.status}
                      onChange={handleChange}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div className="d-flex gap-2 mt-3">
                  <button type="submit" disabled={submitting} className="btn btn-primary">
                    <i className="fas fa-save me-1"></i> {isEdit ? 'Update' : 'Create'} User
                  </button>
                  <Link to="/admin/users" className="btn btn-secondary">
                    Cancel
                  </Link>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminUserForm;
