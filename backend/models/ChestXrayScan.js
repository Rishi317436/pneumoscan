const mongoose = require('mongoose');

const ChestXrayScanSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    imagePath: { type: String, required: true },
    imageFormat: { type: String },
    imageSize: { type: Number },
    filename: { type: String, index: true },
    description: { type: String },
    status: { type: String, enum: ['uploaded', 'processing', 'processed', 'failed'], default: 'uploaded', index: true }
}, { timestamps: true });

ChestXrayScanSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('ChestXrayScan', ChestXrayScanSchema);
