const express = require('express');
const router = express.Router();
const scanController = require('../controllers/scanController');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

router.post('/upload', auth, upload.single('xrayImage'), scanController.postUpload);
router.get('/results', auth, scanController.getResults);
router.get('/', auth, scanController.getResults);
router.get('/status/:id', auth, scanController.getScanStatus);
router.get('/detail/:id', auth, scanController.getDetail);
router.get('/:id', auth, scanController.getDetail);
router.delete('/:id', auth, scanController.deleteScan);

module.exports = router;