const mongoose = require('mongoose');

const ChestXrayDetectionSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    scanId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChestXrayScan' },
    originalImage: { type: String, required: true },
    processedImage: { type: String },
    gradcamImage: { type: String },
    manualDetection: {
        prediction: { type: String },
        score: { type: Number },
        features: { type: mongoose.Schema.Types.Mixed },
        decisionExplanation: { type: String }
    },
    mlDetection: {
        prediction: { type: String },
        confidence: { type: Number },
        modelVersion: { type: String, default: 'v1.0' }
    },
    comparison: {
        agreementStatus: { type: String },
        scoreDifference: { type: Number },
        experimentalCombinedScore: { type: Number }
    },
    clinicalInformation: {
        symptoms: { type: String },
        recentHospitalization: { type: Boolean },
        timeSinceAdmission: { type: String },
        mechanicalVentilation: { type: Boolean },
        aspirationHistory: { type: Boolean },
        otherInfo: { type: String }
    },
    acquisitionClassification: { type: String },
    etiologyPrediction: { type: String },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ChestXrayDetection', ChestXrayDetectionSchema);
