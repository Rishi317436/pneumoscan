const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

router.use(auth, roleCheck);

// 1. Dashboard Overview
router.get('/dashboard', adminController.getDashboard);
router.get('/training-status', adminController.getTrainingStatus);

// 2. User Management
router.get('/users', adminController.listUsers);
router.get('/users/:id', adminController.getUserById);
router.post('/users', adminController.createUser);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);
router.get('/users/:id/scans', adminController.getUserScanHistory);

// 3. X-Ray Scan Management
router.get('/scans', adminController.listAllScans);
router.delete('/scans/:id', adminController.deleteScan);
router.post('/scans/retention', adminController.applyScanRetention);

// 4. Reports Management
router.get('/reports', adminController.listAllReports);
router.post('/reports/:id/regenerate', adminController.regenerateReport);
router.delete('/reports/:id', adminController.deleteReport);

// 5. Activity Logs and Audit Trail
router.get('/activity-logs', adminController.listActivityLogs);

// 6. Feedback Management
router.get('/feedbacks', adminController.listFeedbacks);
router.post('/feedback/:id/respond', adminController.respondFeedback);

// 7. System Settings
router.get('/settings', adminController.getSettings);
router.put('/settings', adminController.updateSettings);

module.exports = router;