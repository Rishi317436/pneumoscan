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

      <div className="row g-4 align-items-stretch">
        {/* Clinician Overview Card */}
        <div className="col-12 col-lg-5 col-xl-4">
          <div className="rad-card p-4 text-center h-100 d-flex flex-column justify-content-between">
            <div>
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
                    width: '110px',
                    height: '110px',
                    background: 'rgba(57, 255, 20, 0.08)',
                    border: '2px solid rgba(57, 255, 20, 0.65)',
                    boxShadow: '0 0 24px rgba(57, 255, 20, 0.25)'
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

                {/* Action Button for Avatar */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="btn btn-sm rounded-circle position-absolute glass-btn d-grid place-items-center p-0"
                  style={{ width: '32px', height: '32px', bottom: '0px', right: '0px', borderColor: 'var(--lightsaber-green)' }}
                  title="Change Profile Photo"
                >
                  <i className="fas fa-camera text-white" style={{ fontSize: '0.8rem' }}></i>
                </button>

                {profilePhoto && (
                  <button
                    type="button"
                    onClick={removePhoto}
                    className="btn btn-sm btn-danger rounded-circle position-absolute d-grid place-items-center p-0"
                    style={{ width: '24px', height: '24px', top: '0px', right: '0px', fontSize: '0.7rem' }}
                    title="Remove Photo"
                  >
                    <i className="fas fa-times"></i>
                  </button>
                )}
              </div>

              <h4 className="text-white fw-bold mb-1">{formData.username || user?.name || 'Clinician'}</h4>
              <span className="badge rounded-pill extra-small holo-badge px-3 py-1 mb-3">
                {user?.role === 'admin' ? 'SYSTEM ADMINISTRATOR' : 'DIAGNOSTIC RADIOLOGIST'}
              </span>

              <div className="border-top border-secondary opacity-25 my-3"></div>

              <div className="text-start small">
                <div className="d-flex justify-content-between align-items-center py-2.5 border-bottom border-secondary border-opacity-25">
                  <span className="text-secondary d-flex align-items-center gap-2">
                    <i className="fas fa-envelope text-cyan" style={{ color: 'var(--rad-cyan)' }}></i>
                    <span>Email Address</span>
                  </span>
                  <span className="text-white fw-medium text-truncate ms-2" style={{ maxWidth: '190px' }} title={user?.email || formData.email}>
                    {user?.email || formData.email || 'N/A'}
                  </span>
                </div>

                <div className="d-flex justify-content-between align-items-center py-2.5 border-bottom border-secondary border-opacity-25">
                  <span className="text-secondary d-flex align-items-center gap-2">
                    <i className="fas fa-calendar-alt text-cyan" style={{ color: 'var(--rad-cyan)' }}></i>
                    <span>Date of Birth</span>
                  </span>
                  <span className="text-white fw-medium">{formData.dob || 'Not Specified'}</span>
                </div>

                <div className="d-flex justify-content-between align-items-center py-2.5 border-bottom border-secondary border-opacity-25">
                  <span className="text-secondary d-flex align-items-center gap-2">
                    <i className="fas fa-phone-alt text-cyan" style={{ color: 'var(--rad-cyan)' }}></i>
                    <span>Contact Phone</span>
                  </span>
                  <span className="text-white fw-medium">{formData.phone || 'N/A'}</span>
                </div>

                <div className="d-flex justify-content-between align-items-center py-2.5 border-bottom border-secondary border-opacity-25">
                  <span className="text-secondary d-flex align-items-center gap-2">
                    <i className="fas fa-user-shield text-cyan" style={{ color: 'var(--rad-cyan)' }}></i>
                    <span>Access Tier</span>
                  </span>
                  <span className="badge px-2.5 py-1 text-uppercase" style={{ background: 'rgba(57, 255, 20, 0.15)', color: 'var(--lightsaber-green, #39ff14)' }}>
                    {user?.role || 'Clinician'}
                  </span>
                </div>

                <div className="d-flex justify-content-between align-items-center py-2.5">
                  <span className="text-secondary d-flex align-items-center gap-2">
                    <i className="fas fa-clock text-cyan" style={{ color: 'var(--rad-cyan)' }}></i>
                    <span>Session Status</span>
                  </span>
                  <span className="text-success d-inline-flex align-items-center gap-1.5 fw-semibold small">
                    <span className="pulse-dot" style={{ width: '7px', height: '7px', backgroundColor: '#39ff14' }}></span> Active
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Settings & Password Form */}
        <div className="col-12 col-lg-7 col-xl-8">
          <div className="rad-card p-4 h-100 d-flex flex-column justify-content-between">
            <div>
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h5 className="text-white mb-0 d-flex align-items-center gap-2">
                  <i className="fas fa-sliders-h" style={{ color: 'var(--lightsaber-green, #39ff14)' }}></i>
                  <span>Account & Security Settings</span>
                </h5>
                <span className="badge bg-dark border border-secondary text-secondary extra-small font-monospace">
                  Direct Clinician Sync
                </span>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="row g-3 mb-4">
                  {/* Full Name */}
                  <div className="col-md-6">
                    <label className="form-label text-secondary small fw-semibold mb-1.5">Full Name / Username</label>
                    <div className="modern-input-group">
                      <span className="input-group-text">
                        <i className="fas fa-user"></i>
                      </span>
                      <input
                        type="text"
                        className="form-control"
                        name="username"
                        value={formData.username}
                        onChange={handleChange}
                        placeholder="Dr. Full Name"
                        required
                      />
                    </div>
                  </div>

                  {/* Email Address */}
                  <div className="col-md-6">
                    <label className="form-label text-secondary small fw-semibold mb-1.5">Email Address</label>
                    <div className="modern-input-group">
                      <span className="input-group-text">
                        <i className="fas fa-envelope"></i>
                      </span>
                      <input
                        type="email"
                        className="form-control"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="clinician@hospital.org"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Row 2: Date of Birth and Contact Phone */}
                <div className="row g-3 mb-4">
                  <div className="col-md-6">
                    <label className="form-label text-secondary small fw-semibold mb-1.5">
                      <i className="fas fa-calendar-alt me-1.5" style={{ color: 'var(--lightsaber-green, #39ff14)' }}></i>
                      Date of Birth
                    </label>
                    <div className="modern-input-group">
                      <span className="input-group-text">
                        <i className="far fa-calendar"></i>
                      </span>
                      <input
                        type="date"
                        className="form-control"
                        name="dob"
                        value={formData.dob}
                        onChange={handleChange}
                        max={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label text-secondary small fw-semibold mb-1.5">
                      <i className="fas fa-phone-alt me-1.5" style={{ color: 'var(--lightsaber-green, #39ff14)' }}></i>
                      Contact Phone Number
                    </label>
                    <div className="modern-input-group">
                      <span className="input-group-text">
                        <i className="fas fa-phone"></i>
                      </span>
                      <input
                        type="tel"
                        className="form-control"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="+1 (555) 000-0000"
                      />
                    </div>
                  </div>
                </div>

                {/* Password Change Box */}
                <div className="p-3.5 p-md-4 rounded-3 mb-4" style={{ background: 'rgba(8, 14, 8, 0.65)', border: '1px solid rgba(57, 255, 20, 0.2)' }}>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h6 className="text-white mb-0 d-flex align-items-center gap-2">
                      <i className="fas fa-shield-alt text-warning"></i>
                      <span>Change Security Password</span>
                    </h6>
                    <span className="text-secondary extra-small font-monospace">Leave blank to keep current password</span>
                  </div>

                  <div className="row g-3">
                    <div className="col-md-4">
                      <label className="form-label text-secondary extra-small fw-semibold mb-1">Current Password</label>
                      <div className="modern-input-group">
                        <span className="input-group-text">
                          <i className="fas fa-lock"></i>
                        </span>
                        <input
                          type="password"
                          className="form-control"
                          name="currentPassword"
                          value={formData.currentPassword}
                          onChange={handleChange}
                          placeholder="••••••••"
                        />
                      </div>
                    </div>

                    <div className="col-md-4">
                      <label className="form-label text-secondary extra-small fw-semibold mb-1">New Password</label>
                      <div className="modern-input-group">
                        <span className="input-group-text">
                          <i className="fas fa-key"></i>
                        </span>
                        <input
                          type="password"
                          className="form-control"
                          name="newPassword"
                          value={formData.newPassword}
                          onChange={handleChange}
                          placeholder="Min 6 characters"
                        />
                      </div>
                    </div>

                    <div className="col-md-4">
                      <label className="form-label text-secondary extra-small fw-semibold mb-1">Confirm New Password</label>
                      <div className="modern-input-group">
                        <span className="input-group-text">
                          <i className="fas fa-check"></i>
                        </span>
                        <input
                          type="password"
                          className="form-control"
                          name="confirmPassword"
                          value={formData.confirmPassword}
                          onChange={handleChange}
                          placeholder="Repeat new password"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Submit Button */}
                <div className="d-flex justify-content-end">
                  <button
                    type="submit"
                    className="glass-btn primary px-4 py-2.5"
                    disabled={saving}
                    style={{ fontSize: '0.98rem', fontWeight: 700 }}
                  >
                    {saving ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        Saving Changes...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-check-circle me-2"></i>Update Profile
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
