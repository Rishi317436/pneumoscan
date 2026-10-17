const express = require('express');
const router = express.Router();
const scanController = require('../controllers/scanController');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/upload', auth, scanController.getUpload);
router.post('/upload', auth, upload.single('xrayImage'), scanController.postUpload);
router.get('/results', auth, scanController.getResults);
router.get('/detail/:id', auth, scanController.getDetail);

module.exports = router;