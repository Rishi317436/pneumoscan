const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

router.use(auth, roleCheck);

router.get('/', adminController.getDashboard);
router.get('/training', adminController.getTrainingPage);
router.post('/feedback/:id/respond', adminController.respondFeedback);

// User CRUD
router.get('/users', adminController.listUsers);
router.get('/users/create', adminController.renderCreateUser);
router.post('/users/create', adminController.createUser);
router.get('/users/edit/:id', adminController.renderEditUser);
router.post('/users/edit/:id', adminController.updateUser);
router.get('/users/delete/:id', adminController.deleteUser);

module.exports = router;