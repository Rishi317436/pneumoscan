const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const auth = require('../middleware/auth');

router.get('/', auth, reportController.getReports);
router.get('/:id', auth, reportController.getReportById);

module.exports = router;