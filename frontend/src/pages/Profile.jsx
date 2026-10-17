import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { authAPI } from '../services/api';

const Profile = () => {
  const { user, checkAuth } = useAuth();
  const { addToast } = useToast();
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    phone: '',
    dob: '',
    gender: 'Other',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [profilePhoto, setProfilePhoto] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      let formattedDob = '';
      if (user.dob) {
        try {
          formattedDob = new Date(user.dob).toISOString().split('T')[0];
        } catch {
          formattedDob = user.dob;
        }
      }
      setFormData(prev => ({
        ...prev,
        username: user.name || user.username || '',
        email: user.email || '',
        phone: user.phone || '',
        dob: formattedDob,
        gender: user.gender || 'Other'
      }));
      setProfilePhoto(user.profilePhoto || '');
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      addToast('Please select a valid image file', 'warning');
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      addToast('Profile photo size should be under 3MB', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setProfilePhoto(reader.result);
      addToast('New profile photo loaded. Click "Update Profile" to save.', 'info');
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = () => {
    setProfilePhoto('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    addToast('Profile photo removed. Click "Update Profile" to save.', 'info');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
      addToast('New passwords do not match.', 'error');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        name: formData.username,
        username: formData.username,
        email: formData.email,
        phone: formData.phone,
        dob: formData.dob || null,
        gender: formData.gender,
        profilePhoto: profilePhoto
      };

      if (formData.newPassword) {
        payload.currentPassword = formData.currentPassword;
        payload.newPassword = formData.newPassword;
      }

      const res = await authAPI.updateProfile(payload);
      if (res.data.success) {
        addToast('Profile updated successfully.', 'success');
        setFormData(prev => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        }));
        await checkAuth();
      } else {
        addToast(res.data.message || 'Failed to update profile.', 'error');
      }
    } catch (err) {
      console.error('Update profile error:', err);
      addToast(err.response?.data?.message || 'Error updating profile settings.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pacs-workspace container-fluid py-4 px-lg-5">
      <div className="workspace-header mb-4">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
          <div>
            <h2 className="pacs-title mb-1 text-white fw-bold">
              <i className="fas fa-id-badge me-2" style={{ color: 'var(--lightsaber-green, #39ff14)' }}></i>
              Clinician Profile & Account
            </h2>
            <p className="text-secondary small mb-0">
              Manage your diagnostic identity, profile photo, credentials, and security settings.
            </p>
          </div>
          <div className="d-inline-flex align-items-center gap-2 px-3 py-1.5 rounded-pill glass-card" style={{ border: '1px solid rgba(57, 255, 20, 0.4)' }}>
            <span className="pulse-dot" style={{ backgroundColor: 'var(--lightsaber-green, #39ff14)', width: '8px', height: '8px', borderRadius: '50%' }}></span>
            <span className="small text-secondary fw-semibold">ROLE:</span>
            <strong className="text-white text-uppercase" style={{ color: 'var(--lightsaber-green, #39ff14)' }}>
              {user?.role || 'CLINICIAN'}
            </strong>
          </div>
        </div>
      </div>

      <div className="row g-4">
        {/* Clinician Overview Card */}
        <div className="col-lg-4">
          <div className="rad-card p-4 text-center h-100">
            {/* Hidden File Input for Avatar */}
            <input
              type="file"
              ref={fileInputRef}
              className="d-none"
              accept="image/*"
              onChange={handlePhotoUpload}
            />

            {/* Profile Avatar with Edit Overlay */}
            <div className="avatar-container mb-3 position-relative d-inline-block">
              <div 
                className="rounded-circle d-flex align-items-center justify-content-center mx-auto overflow-hidden position-relative"
                style={{
                  width: '120px',
                  height: '120px',
                  background: 'rgba(57, 255, 20, 0.12)',
                  border: '2px solid var(--lightsaber-green, #39ff14)',
                  boxShadow: '0 0 20px rgba(57, 255, 20, 0.35)'
                }}
              >
                {profilePhoto ? (
                  <img
                    src={profilePhoto}
                    alt="User Profile"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <i className="fas fa-user-md fa-3x" style={{ color: 'var(--lightsaber-green, #39ff14)' }}></i>
                )}
              </div>

              {/* Action Buttons for Avatar */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn btn-sm rounded-circle position-absolute glass-btn d-grid place-items-center p-0"
                style={{ width: '34px', height: '34px', bottom: '0px', right: '0px', borderColor: 'var(--lightsaber-green)' }}
                title="Change Photo"
              >
                <i className="fas fa-camera text-white" style={{ fontSize: '0.85rem' }}></i>
              </button>

              {profilePhoto && (
                <button
                  type="button"
                  onClick={removePhoto}
                  className="btn btn-sm btn-danger rounded-circle position-absolute d-grid place-items-center p-0"
                  style={{ width: '26px', height: '26px', top: '0px', right: '0px', fontSize: '0.75rem' }}
                  title="Remove Photo"
                >
                  <i className="fas fa-times"></i>
                </button>
              )}
            </div>

            <h4 className="text-white fw-bold mb-1">{formData.username || 'Clinician'}</h4>
            <span className="badge rounded-pill extra-small holo-badge px-3 py-1 mb-3">
              {user?.role === 'admin' ? 'SYSTEM ADMINISTRATOR' : 'DIAGNOSTIC CHEST X-RAY SPECIALIST'}
            </span>

            <div className="border-top border-secondary opacity-25 my-3"></div>

            <div className="text-start small space-y-2">
              <div className="d-flex justify-content-between py-2 border-bottom border-secondary border-opacity-25">
                <span className="text-secondary"><i className="fas fa-envelope me-2"></i>Email</span>
                <span className="text-white fw-medium">{user?.email || 'N/A'}</span>
              </div>
              <div className="d-flex justify-content-between py-2 border-bottom border-secondary border-opacity-25">
                <span className="text-secondary"><i className="fas fa-calendar-alt me-2"></i>Date of Birth</span>
                <span className="text-white fw-medium">{formData.dob || 'Not Specified'}</span>
              </div>
              <div className="d-flex justify-content-between py-2 border-bottom border-secondary border-opacity-25">
                <span className="text-secondary"><i className="fas fa-phone me-2"></i>Contact</span>
                <span className="text-white fw-medium">{formData.phone || 'N/A'}</span>
              </div>
              <div className="d-flex justify-content-between py-2 border-bottom border-secondary border-opacity-25">
                <span className="text-secondary"><i className="fas fa-shield-alt me-2"></i>Access Level</span>
                <span className="text-capitalize fw-bold" style={{ color: 'var(--lightsaber-green, #39ff14)' }}>{user?.role || 'Clinician'}</span>
              </div>
              <div className="d-flex justify-content-between py-2">
                <span className="text-secondary"><i className="fas fa-clock me-2"></i>Session</span>
                <span className="text-success"><i className="fas fa-check-circle me-1"></i>Active</span>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Settings & Password Form */}
        <div className="col-lg-8">
          <div className="rad-card p-4">
            <h5 className="text-white mb-4 d-flex align-items-center gap-2">
              <i className="fas fa-user-cog" style={{ color: 'var(--lightsaber-green, #39ff14)' }}></i>
              <span>Account & Security Settings</span>
            </h5>

            <form onSubmit={handleSubmit}>
              <div className="row g-3 mb-4">
                <div className="col-md-6">
                  <label className="form-label text-secondary small fw-semibold">Full Name / Username</label>
                  <div className="input-group">
                    <span className="input-group-text glass-card border-secondary text-secondary">
                      <i className="fas fa-user"></i>
                    </span>
                    <input
                      type="text"
                      className="form-control glass-card text-white"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="col-md-6">
                  <label className="form-label text-secondary small fw-semibold">Email Address</label>
                  <div className="input-group">
                    <span className="input-group-text glass-card border-secondary text-secondary">
                      <i className="fas fa-at"></i>
                    </span>
                    <input
                      type="email"
                      className="form-control glass-card text-white"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Row 2: Date of Birth (DOB) and Contact Number */}
              <div className="row g-3 mb-4">
                <div className="col-md-6">
                  <label className="form-label text-secondary small fw-semibold">
                    <i className="fas fa-calendar-day me-1.5" style={{ color: 'var(--lightsaber-green, #39ff14)' }}></i>
                    Date of Birth (DOB)
                  </label>
                  <div className="input-group">
                    <span className="input-group-text glass-card border-secondary text-secondary">
                      <i className="far fa-calendar-alt"></i>
                    </span>
                    <input
                      type="date"
                      className="form-control glass-card text-white"
                      name="dob"
                      value={formData.dob}
                      onChange={handleChange}
                      max={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                </div>

                <div className="col-md-6">
                  <label className="form-label text-secondary small fw-semibold">
                    <i className="fas fa-phone-alt me-1.5" style={{ color: 'var(--lightsaber-green, #39ff14)' }}></i>
                    Contact Phone Number
                  </label>
                  <div className="input-group">
                    <span className="input-group-text glass-card border-secondary text-secondary">
                      <i className="fas fa-phone"></i>
                    </span>
                    <input
                      type="tel"
                      className="form-control glass-card text-white"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>
                </div>
              </div>

              <div className="border-top border-secondary opacity-25 my-4"></div>

              <h6 className="text-white mb-3">
                <i className="fas fa-key text-warning me-2"></i>Change Security Password
                <small className="text-secondary ms-2 fw-normal">(Leave blank to keep unchanged)</small>
              </h6>

              <div className="row g-3 mb-4">
                <div className="col-md-4">
                  <label className="form-label text-secondary small">Current Password</label>
                  <input
                    type="password"
                    className="form-control glass-card text-white"
                    name="currentPassword"
                    value={formData.currentPassword}
                    onChange={handleChange}
                    placeholder="••••••••"
                  />
                </div>

                <div className="col-md-4">
                  <label className="form-label text-secondary small">New Password</label>
                  <input
                    type="password"
                    className="form-control glass-card text-white"
                    name="newPassword"
                    value={formData.newPassword}
                    onChange={handleChange}
                    placeholder="Min 6 characters"
                  />
                </div>

                <div className="col-md-4">
                  <label className="form-label text-secondary small">Confirm New Password</label>
                  <input
                    type="password"
                    className="form-control glass-card text-white"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Repeat password"
                  />
                </div>
              </div>

              <div className="d-flex justify-content-end gap-3">
                <button
                  type="submit"
                  className="glass-btn primary px-4 py-2"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Saving Changes...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-save me-2"></i>Update Profile
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
