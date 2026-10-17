const mongoose = require('mongoose');

const ChestXrayDetectionSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    scanId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChestXrayScan', index: true },
    originalImage: { type: String, required: true },
    processedImage: { type: String },
    gradcamImage: { type: String },
    manualDetection: {
        prediction: { type: String },
        score: { type: Number },
        clinical_verdict: { type: String },
        decisionExplanation: { type: String },
        abnormal_zone_count: { type: Number },
        suspicious_zone_count: { type: Number },
        normal_zone_count: { type: Number },
        zones: { type: mongoose.Schema.Types.Mixed },
        zoneOverlayImage: { type: String },
        intermediate_stages: { type: mongoose.Schema.Types.Mixed },
        features: { type: mongoose.Schema.Types.Mixed }
    },
    mlDetection: {
        prediction: { type: String, index: true },
        confidence: { type: Number },
        modelVersion: { type: String, default: 'v1.0' }
    },
    comparison: {
        agreementStatus: { type: String, index: true },
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
    createdAt: { type: Date, default: Date.now, index: true }
});

// Compound indexes for high-speed filtered/sorted worklist queries
ChestXrayDetectionSchema.index({ user: 1, createdAt: -1 });
ChestXrayDetectionSchema.index({ user: 1, 'mlDetection.prediction': 1 });
ChestXrayDetectionSchema.index({ user: 1, 'comparison.agreementStatus': 1 });

module.exports = mongoose.model('ChestXrayDetection', ChestXrayDetectionSchema);
