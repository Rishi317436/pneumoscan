const mongoose = require('mongoose');

const SystemSettingsSchema = new mongoose.Schema({
    allowedImageFormats: { 
        type: [String], 
        default: ['image/jpeg', 'image/png', 'image/jpg', 'application/dicom'] 
    },
    maxUploadSizeMB: { type: Number, default: 25 },
    modelThreshold: { type: Number, default: 0.5 },
    sessionSecurityTimeoutHours: { type: Number, default: 24 },
    emailNotificationsEnabled: { type: Boolean, default: true },
    auditLogRetentionDays: { type: Number, default: 90 },
    scanRetentionDays: { type: Number, default: 365 },
    autoPurgeEnabled: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('SystemSettings', SystemSettingsSchema);
