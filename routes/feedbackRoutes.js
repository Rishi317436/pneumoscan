const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');
const auth = require('../middleware/auth');

router.get('/', auth, feedbackController.getFeedbackPage);
router.post('/', auth, feedbackController.submitFeedback);

module.exports = router;