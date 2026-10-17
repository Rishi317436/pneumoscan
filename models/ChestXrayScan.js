const mongoose = require('mongoose');

const ChestXrayScanSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    imagePath: { type: String, required: true },
    imageFormat: { type: String },
    imageSize: { type: Number },
    filename: { type: String },
    description: { type: String },
    status: { type: String, enum: ['uploaded', 'processing', 'processed', 'failed'], default: 'uploaded' }
}, { timestamps: true });

module.exports = mongoose.model('ChestXrayScan', ChestXrayScanSchema);
