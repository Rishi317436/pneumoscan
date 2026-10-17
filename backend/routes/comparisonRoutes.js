const express = require('express');
const router = express.Router();
const comparisonController = require('../controllers/comparisonController');
const auth = require('../middleware/auth');

router.get('/', auth, comparisonController.getComparisonData);

module.exports = router;
