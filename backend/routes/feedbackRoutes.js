const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');
const auth = require('../middleware/auth');

router.get('/', auth, feedbackController.getFeedbackList);
router.post('/', auth, feedbackController.submitFeedback);
router.delete('/:id', auth, feedbackController.deleteFeedback);

module.exports = router;