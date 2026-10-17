const mongoose = require('mongoose');

const FeedbackSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    rating: { type: Number, min: 1, max: 5, default: 5 },
    comments: { type: String },
    message: { type: String },
    feedbackType: { type: String, default: 'general' },
    type: { type: String, default: 'general' },
    status: { type: String, enum: ['pending', 'reviewed', 'resolved', 'responded'], default: 'pending', index: true },
    adminResponse: { type: String },
    responseDate: { type: Date }
}, { timestamps: true });

FeedbackSchema.index({ userId: 1, createdAt: -1 });
FeedbackSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Feedback', FeedbackSchema);