const Feedback = require('../models/Feedback');

exports.getFeedbackPage = async (req, res) => {
    try {
        const feedbacks = await Feedback.find({ userId: req.session.user.id }).sort({ createdAt: -1 });
        res.render('feedback', {
            feedbacks: feedbacks || []
        });
    } catch (error) {
        console.error('Error fetching feedbacks:', error);
        res.render('feedback', {
            feedbacks: []
        });
    }
};

exports.submitFeedback = async (req, res) => {
    try {
        const { rating, comments, message, feedbackType, type } = req.body;
        const feedback = new Feedback({
            userId: req.session.user.id,
            rating: Number(rating) || 5,
            comments: comments || message || '',
            message: message || comments || '',
            feedbackType: feedbackType || type || 'general',
            type: type || feedbackType || 'general',
            status: 'pending'
        });
        await feedback.save();
        req.session.success = 'Feedback submitted successfully.';
        res.redirect('/feedback');
    } catch (error) {
        console.error('Error submitting feedback:', error);
        req.session.error = 'Failed to submit feedback.';
        res.redirect('/feedback');
    }
};