import axios from 'axios';

export const API_BASE_URL = 'http://localhost:5000';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Helper for building image URLs
export const getImageUrl = (relativePath) => {
  if (!relativePath) return '';
  if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
    return relativePath;
  }
  const cleanPath = relativePath.replace(/\\/g, '/');
  return `${API_BASE_URL}/${cleanPath.startsWith('/') ? cleanPath.substring(1) : cleanPath}`;
};

// Auth API
export const authAPI = {
  getMe: () => api.get('/auth/me'),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (userData) => api.put('/auth/profile', userData),
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  logout: () => api.post('/auth/logout')
};

// Scan / Detection API
export const scanAPI = {
  uploadScan: (formData) => api.post('/scan/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getResults: () => api.get('/scan/results'),
  getDetail: (id) => api.get(`/scan/detail/${id}`)
};

// Reports API
export const reportAPI = {
  getReports: () => api.get('/report'),
  getReportById: (id) => api.get(`/report/${id}`)
};

// Comparison API
export const comparisonAPI = {
  getComparisonData: () => api.get('/comparison')
};

// Feedback API
export const feedbackAPI = {
  getFeedbackList: () => api.get('/feedback'),
  submitFeedback: (feedbackData) => api.post('/feedback', feedbackData)
};

// Admin API
export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),
  getTrainingStatus: () => api.get('/admin/training-status'),
  
  // User Management
  getUsers: (page = 1, search = '', limit = 10) => api.get(`/admin/users?page=${page}&search=${encodeURIComponent(search)}&limit=${limit}`),
  getUserById: (id) => api.get(`/admin/users/${id}`),
  createUser: (userData) => api.post('/admin/users', userData),
  updateUser: (id, userData) => api.put(`/admin/users/${id}`, userData),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  getUserScans: (id) => api.get(`/admin/users/${id}/scans`),

  // Scan Management
  getAllScans: (page = 1, search = '', prediction = '', status = '', limit = 10) =>
    api.get(`/admin/scans?page=${page}&search=${encodeURIComponent(search)}&prediction=${encodeURIComponent(prediction)}&status=${encodeURIComponent(status)}&limit=${limit}`),
  deleteScan: (id) => api.delete(`/admin/scans/${id}`),
  applyScanRetention: (days = 90) => api.post('/admin/scans/retention', { days }),

  // Reports Management
  getAllReports: (page = 1, search = '', limit = 10) =>
    api.get(`/admin/reports?page=${page}&search=${encodeURIComponent(search)}&limit=${limit}`),
  regenerateReport: (id) => api.post(`/admin/reports/${id}/regenerate`),
  deleteReport: (id) => api.delete(`/admin/reports/${id}`),

  // Activity Logs
  getActivityLogs: (page = 1, search = '', action = '', limit = 15) =>
    api.get(`/admin/activity-logs?page=${page}&search=${encodeURIComponent(search)}&action=${encodeURIComponent(action)}&limit=${limit}`),

  // Feedback Management
  getFeedbacks: (status = '') => api.get(`/admin/feedbacks?status=${encodeURIComponent(status)}`),
  respondFeedback: (id, response) => api.post(`/admin/feedback/${id}/respond`, { response }),

  // System Settings
  getSettings: () => api.get('/admin/settings'),
  updateSettings: (settingsData) => api.put('/admin/settings', settingsData)
};

export default api;
