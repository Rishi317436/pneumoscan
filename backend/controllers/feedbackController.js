const Feedback = require('../models/Feedback');

exports.getFeedbackList = async (req, res) => {
    try {
        const query = req.session.user.role === 'admin' ? {} : { userId: req.session.user.id };
        const feedbacks = await Feedback.find(query)
            .populate('userId', 'name email')
            .sort({ createdAt: -1 })
            .lean();

        res.json({
            success: true,
            feedbacks: feedbacks || []
        });
    } catch (error) {
        console.error('Error fetching feedbacks:', error);
        res.status(500).json({
            success: false,
            feedbacks: [],
            message: 'Failed to fetch feedbacks'
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
        
        const populated = await Feedback.findById(feedback._id)
            .populate('userId', 'name email')
            .lean();

        res.status(201).json({
            success: true,
            message: 'Feedback submitted successfully.',
            feedback: populated
        });
    } catch (error) {
        console.error('Error submitting feedback:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit feedback.'
        });
    }
};

exports.deleteFeedback = async (req, res) => {
    try {
        const query = req.session.user.role === 'admin' ? { _id: req.params.id } : { _id: req.params.id, userId: req.session.user.id };
        const deleted = await Feedback.findOneAndDelete(query);
        if (!deleted) {
            return res.status(404).json({ success: false, message: 'Feedback not found or unauthorized.' });
        }
        res.json({ success: true, message: 'Feedback removed successfully.' });
    } catch (error) {
        console.error('deleteFeedback error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete feedback.' });
    }
};