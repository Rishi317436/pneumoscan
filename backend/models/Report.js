const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
    detectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChestXrayDetection', index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    reportType: { type: String, default: 'Pneumonia Detection Report' },
    findings: { type: String },
    recommendations: { type: String },
    generatedBy: { type: String, default: 'System' },
    reportFormat: { type: String, default: 'image' },
    downloadCount: { type: Number, default: 0 }
}, { timestamps: true });

ReportSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Report', ReportSchema);