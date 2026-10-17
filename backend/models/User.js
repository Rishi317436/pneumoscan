const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    registrationNumber: { type: String, index: true },
    designation: { type: String }, // e.g., Consultant Radiologist, Pulmonologist
    department: { type: String }, // e.g., Diagnostic Radiology, Emergency Medicine
    institution: { type: String }, // e.g., St. Jude General Hospital
    medicalLicense: { type: String }, // e.g., GMC-891234
    specialization: { type: String }, // e.g., Thoracic Imaging, Pulmonology
    password: { type: String, required: true },
    phone: { type: String },
    dob: { type: Date },
    gender: { type: String, enum: ["Male", "Female", "Other"], default: 'Other' },
    profilePhoto: { type: String, default: '' },
    role: { type: String, enum: ['user', 'admin'], default: 'user', index: true },
    address: { type: String },
    status: { type: String, enum: ['active', 'inactive'], default: 'active', index: true }
}, { timestamps: true });

UserSchema.index({ role: 1, status: 1 });
UserSchema.index({ createdAt: -1 });

UserSchema.pre('save', async function(next) {
    if (!this.isModified('password')) {
        return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

UserSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);