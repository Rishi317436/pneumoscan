const mongoose = require('mongoose');

const ChestXrayScanSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    imagePath: { type: String, required: true },
    imageFormat: { type: String },
    imageSize: { type: Number },
    filename: { type: String, index: true },
    description: { type: String },
    status: { type: String, enum: ['uploaded', 'processing', 'processed', 'failed'], default: 'uploaded', index: true }
}, { timestamps: true });

ChestXrayScanSchema.pre('validate', function(next) {
    if (this.user && !this.userId) {
        this.userId = this.user;
    } else if (this.userId && !this.user) {
        this.user = this.userId;
    }
    if (!this.userId && !this.user) {
        return next(new Error('ChestXrayScan requires a valid userId or user reference.'));
    }
    next();
});

ChestXrayScanSchema.index({ userId: 1, createdAt: -1 });
ChestXrayScanSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('ChestXrayScan', ChestXrayScanSchema);
