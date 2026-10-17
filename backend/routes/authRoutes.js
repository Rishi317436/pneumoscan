const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');

router.get('/me', authController.getMe);
router.get('/profile', auth, authController.getMe);
router.put('/profile', auth, authController.updateProfile);
router.post('/login', authController.postLogin);
router.post('/register', authController.postRegister);
router.post('/logout', authController.getLogout);
router.get('/logout', authController.getLogout);

module.exports = router;