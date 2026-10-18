import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import '../styles/auth.css';

const AuthRegister = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    dob: '',
    gender: 'Other',
    password: '',
    confirmPassword: ''
  });
  const [profilePhoto, setProfilePhoto] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const photoInputRef = useRef(null);

  const { theme, toggleTheme } = useTheme();
  const { register } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const isLight = theme === 'light';

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
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
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = (e) => {
    e.stopPropagation();
    setProfilePhoto('');
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      addToast('Please enter your full name', 'warning');
      return;
    }

    if (!formData.email.trim()) {
      addToast('Please enter your email address', 'warning');
      return;
    }

    if (formData.password.length < 6) {
      addToast('Password must be at least 6 characters', 'warning');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      addToast('Passwords do not match', 'error');
      return;
    }

    setLoading(true);
    const res = await register({
      name: formData.name.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      dob: formData.dob || null,
      gender: formData.gender,
      profilePhoto: profilePhoto || '',
      password: formData.password
    });
    setLoading(false);

    if (res.success) {
      addToast('Clinician account created successfully! Welcome to PneumoScan.', 'success');
      navigate('/workspace');
    } else {
      addToast(res.message || 'Registration failed. Please try again.', 'error');
    }
  };

  return (
    <div className={`pneumo-auth-wrapper ${isLight ? 'theme-light' : 'theme-dark'}`}>
      {/* Top Header */}
      <header className="pneumo-auth-header">
        <div className="pneumo-brand">
          <div className="pneumo-brand-mark">P/</div>
          <div>
            <div className="pneumo-brand-title">
              Pneumo<span className="scan-accent">Scan</span>
            </div>
            <span className="pneumo-brand-tagline">CHEST X-RAY CAD & PACS WORKSPACE</span>
          </div>
        </div>

        {/* Instant Theme Toggle Switch */}
        <div 
          className="pneumo-theme-toggle" 
          onClick={toggleTheme} 
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && toggleTheme()}
          aria-label={isLight ? 'Switch to dark theme' : 'Switch to light theme'}
          title={isLight ? 'Switch to dark theme' : 'Switch to light theme'}
        >
          <span>{isLight ? '☀ Light' : '☾ Dark'}</span>
          <span className="pneumo-switch-track">
            <span className="pneumo-switch-thumb"></span>
          </span>
        </div>
      </header>

      {/* Main Content: Centered glass card */}
      <div className="pneumo-auth-content">
        <div className="pneumo-card" style={{ maxWidth: '560px' }}>
          <div className="pneumo-card-header text-center">
            <div className="pneumo-title-divider">
              <span className="line"></span>
              <h2 className="pneumo-card-title">Sign Up</h2>
              <span className="line"></span>
            </div>
            <p className="pneumo-card-subtitle">Create your clinical account to access the PACS workspace</p>
          </div>

          <form onSubmit={handleSubmit}>
            {/* User Profile Photo Upload Circle */}
            <div className="d-flex flex-column align-items-center mb-4">
              <input
                type="file"
                ref={photoInputRef}
                className="d-none"
                accept="image/*"
                onChange={handlePhotoUpload}
              />
              <div
                onClick={() => photoInputRef.current?.click()}
                className="position-relative cursor-pointer"
                title="Click to upload profile photo"
                style={{
                  width: '92px',
                  height: '92px',
                  borderRadius: '50%',
                  border: '2px dashed var(--lightsaber-green, #39ff14)',
                  padding: '3px',
                  background: isLight ? 'rgba(255,255,255,0.7)' : 'rgba(20,30,20,0.6)',
                  display: 'grid',
                  placeItems: 'center',
                  boxShadow: '0 0 16px rgba(57, 255, 20, 0.25)',
                  transition: 'all 0.2s ease'
                }}
              >
                {profilePhoto ? (
                  <img
                    src={profilePhoto}
                    alt="Profile Preview"
                    style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: '50%',
                      objectFit: 'cover'
                    }}
                  />
                ) : (
                  <div className="text-center" style={{ color: 'var(--lightsaber-green, #39ff14)' }}>
                    <i className="fas fa-camera fa-lg"></i>
                    <span className="d-block extra-small mt-1" style={{ fontSize: '0.65rem', fontWeight: 600 }}>ADD PHOTO</span>
                  </div>
                )}

                {profilePhoto && (
                  <button
                    type="button"
                    onClick={removePhoto}
                    className="position-absolute btn btn-sm btn-danger rounded-circle p-0 d-grid place-items-center"
                    style={{ width: '22px', height: '22px', top: '0px', right: '0px', fontSize: '0.65rem' }}
                    title="Remove Photo"
                  >
                    <i className="fas fa-times"></i>
                  </button>
                )}
              </div>
              <span className="extra-small text-muted mt-1.5" style={{ fontSize: '0.75rem' }}>
                Profile Photo <span className="opacity-75">(Optional &bull; Max 3MB)</span>
              </span>
            </div>

            {/* Input 1: Full Name */}
            <div className="pneumo-form-group">
              <div className="pneumo-input-wrap">
                <i className="far fa-user pneumo-input-icon"></i>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="pneumo-input"
                  placeholder="Full Name (e.g., Dr. Sarah Lin)"
                  required
                  autoComplete="name"
                />
              </div>
            </div>

            {/* Input 2: Email & Phone (2-col grid) */}
            <div className="row g-2 mb-3">
              <div className="col-md-6">
                <div className="pneumo-input-wrap">
                  <i className="far fa-envelope pneumo-input-icon"></i>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="pneumo-input"
                    placeholder="Email Address"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>
              <div className="col-md-6">
                <div className="pneumo-input-wrap">
                  <i className="fas fa-phone-alt pneumo-input-icon"></i>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="pneumo-input"
                    placeholder="Contact Number"
                    autoComplete="tel"
                  />
                </div>
              </div>
            </div>

            {/* Input 3: Date of Birth (DOB calendar / manual) & Gender (2-col grid) */}
            <div className="row g-2 mb-3">
              <div className="col-md-6">
                <div className="pneumo-input-wrap" title="Date of Birth (Select from calendar or type YYYY-MM-DD)">
                  <i className="far fa-calendar-alt pneumo-input-icon"></i>
                  <input
                    type="date"
                    name="dob"
                    value={formData.dob}
                    onChange={handleChange}
                    className="pneumo-input"
                    max={new Date().toISOString().split('T')[0]}
                    placeholder="Date of Birth"
                  />
                </div>
              </div>
              <div className="col-md-6">
                <div className="pneumo-input-wrap">
                  <i className="fas fa-venus-mars pneumo-input-icon"></i>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className="pneumo-input"
                    style={{ paddingLeft: '2.5rem' }}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other / Non-Binary</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Input 4: Password & Confirm Password (2-col grid) */}
            <div className="row g-2 mb-3">
              <div className="col-md-6">
                <div className="pneumo-input-wrap">
                  <i className="fas fa-lock pneumo-input-icon"></i>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="pneumo-input"
                    placeholder="Password (min. 6 chars)"
                    required
                    autoComplete="new-password"
                  />
                </div>
              </div>
              <div className="col-md-6">
                <div className="pneumo-input-wrap">
                  <i className="fas fa-lock pneumo-input-icon"></i>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="pneumo-input"
                    placeholder="Confirm Password"
                    required
                    autoComplete="new-password"
                  />
                </div>
              </div>
            </div>

            {/* Show Password Checkbox */}
            <div className="pneumo-checkbox-row">
              <label className="pneumo-checkbox-label">
                <input
                  type="checkbox"
                  checked={showPassword}
                  onChange={(e) => setShowPassword(e.target.checked)}
                  style={{ accentColor: 'var(--lightsaber-green)' }}
                />
                <span>Show password</span>
              </label>
            </div>

            {/* Lightsaber Glass Pill Button */}
            <button
              type="submit"
              disabled={loading}
              className="pneumo-btn-pill"
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Registering Account...
                </>
              ) : (
                <>
                  Sign Up <span style={{ fontSize: '1.15rem', marginLeft: '4px' }}>&rarr;</span>
                </>
              )}
            </button>

            {/* Login Footer Link */}
            <div className="pneumo-footer-link">
              Already have an account? <Link to="/login">Login</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AuthRegister;
