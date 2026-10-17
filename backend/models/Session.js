const mongoose = require('mongoose');

const SessionSchema = new mongoose.Schema({
    _id: String,
    session: String,
    expires: Date
});

module.exports = mongoose.model('Session', SessionSchema);