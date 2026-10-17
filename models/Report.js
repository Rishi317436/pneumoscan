const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
    detectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChestXrayDetection' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reportType: { type: String, default: 'Pneumonia Detection Report' },
    findings: { type: String },
    recommendations: { type: String },
    generatedBy: { type: String, default: 'System' },
    reportFormat: { type: String, default: 'image' },
    downloadCount: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Report', ReportSchema);