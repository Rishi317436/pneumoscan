const mongoose = require('mongoose');

const AlgorithmSchema = new mongoose.Schema({
    name: { type: String, required: true },
    version: { type: String, required: true },
    description: { type: String },
    isActive: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Algorithm', AlgorithmSchema);