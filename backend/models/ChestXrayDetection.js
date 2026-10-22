const mongoose = require('mongoose');

const ChestXrayDetectionSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    scanId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChestXrayScan', index: true },
    originalImage: { type: String, required: true },
    processedImage: { type: String },
    gradcamImage: { type: String },
    manualDetection: {
        prediction: { type: String },
        score: { type: Number },
        confidence: { type: Number },
        rawPrediction: { type: String },
        rawScore: { type: Number },
        adjudicated: { type: Boolean, default: false },
        adjudicationNote: { type: String },
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
        adjudicated: { type: Boolean, default: false },
        adjudicationReason: { type: String },
        originalManualPrediction: { type: String },
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
}, { strict: false });

ChestXrayDetectionSchema.pre('validate', function(next) {
    if (this.user && !this.userId) {
        this.userId = this.user;
    } else if (this.userId && !this.user) {
        this.user = this.userId;
    }
    if (!this.user && !this.userId) {
        return next(new Error('ChestXrayDetection requires user or userId.'));
    }
    next();
});

// Compound indexes for high-speed filtered/sorted worklist queries
ChestXrayDetectionSchema.index({ user: 1, createdAt: -1 });
ChestXrayDetectionSchema.index({ userId: 1, createdAt: -1 });
ChestXrayDetectionSchema.index({ user: 1, 'mlDetection.prediction': 1 });
ChestXrayDetectionSchema.index({ user: 1, 'comparison.agreementStatus': 1 });

module.exports = mongoose.model('ChestXrayDetection', ChestXrayDetectionSchema);
