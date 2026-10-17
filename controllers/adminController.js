const User = require('../models/User');
const ChestXrayScan = require('../models/ChestXrayScan');
const ChestXrayDetection = require('../models/ChestXrayDetection');
const Feedback = require('../models/Feedback');
const ActivityLog = require('../models/ActivityLog');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

exports.getDashboard = async (req, res) => {
    try {
        const userCount = await User.countDocuments({ role: 'user' });
        const scanCount = await ChestXrayScan.countDocuments();
        
        const pneumoniaDetections = await ChestXrayDetection.find({ 'mlDetection.prediction': 'PNEUMONIA' });
        const pneumoniaCount = pneumoniaDetections.length;
        
        const pendingFeedbackCount = await Feedback.countDocuments({ status: 'pending' });
        const recentLogs = await ActivityLog.find().populate('userId').sort({ createdAt: -1 }).limit(10);
        const feedbacks = await Feedback.find().populate('userId').sort({ createdAt: -1 }).limit(5);

        res.render('admin', {
            stats: { users: userCount, scans: scanCount, pneumoniaDetected: pneumoniaCount, pendingFeedback: pendingFeedbackCount },
            totalUsers: userCount,
            totalScans: scanCount,
            pneumoniaDetected: pneumoniaCount,
            pendingFeedback: pendingFeedbackCount,
            recentLogs,
            feedbacks
        });
    } catch (error) {
        console.error(error);
        res.render('admin', { 
            stats: { users: 0, scans: 0, pneumoniaDetected: 0, pendingFeedback: 0 }, 
            totalUsers: 0, totalScans: 0, pneumoniaDetected: 0, pendingFeedback: 0,
            recentLogs: [], feedbacks: [] 
        });
    }
};

exports.respondFeedback = async (req, res) => {
    try {
        const { response } = req.body;
        await Feedback.findByIdAndUpdate(req.params.id, {
            adminResponse: response,
            status: 'resolved'
        });
        req.session.success = 'Responded to feedback successfully.';
        res.redirect('/admin');
    } catch (error) {
        console.error(error);
        req.session.error = 'Failed to respond to feedback.';
        res.redirect('/admin');
    }
};

exports.getTrainingPage = (req, res) => {
    try {
        const resultsDir = path.join(__dirname, '..', 'dip_engine', 'results');
        const modelsDir = path.join(__dirname, '..', 'dip_engine', 'models');
        const datasetPath = process.env.DATASET_PATH || path.join(__dirname, '..', 'dip_engine', 'chest_xray');
        
        let statusInfo = {
            datasetPath: datasetPath,
            datasetExists: fs.existsSync(datasetPath)
        };

        const manualPath = path.join(resultsDir, 'manual_metrics.json');
        if (fs.existsSync(manualPath)) statusInfo.manualMetrics = JSON.parse(fs.readFileSync(manualPath, 'utf8'));

        const mlPath = path.join(resultsDir, 'ml_metrics.json');
        if (fs.existsSync(mlPath)) statusInfo.mlMetrics = JSON.parse(fs.readFileSync(mlPath, 'utf8'));

        const compPath = path.join(resultsDir, 'model_comparison.json');
        if (fs.existsSync(compPath)) statusInfo.modelComparison = JSON.parse(fs.readFileSync(compPath, 'utf8'));

        statusInfo.modelExists = fs.existsSync(path.join(modelsDir, 'pneumonia_binary_model.keras'));
        statusInfo.thresholdsExists = fs.existsSync(path.join(modelsDir, 'manual_thresholds.json'));

        res.render('admin_training', { statusInfo });
    } catch (error) {
        console.error(error);
        res.render('admin_training', { statusInfo: { error: 'Failed to load training status' } });
    }
};

// User CRUD
exports.listUsers = async (req, res) => {
    try {
        const users = await User.find().sort({ createdAt: -1 });
        res.render('user_list', { users });
    } catch (error) {
        console.error(error);
        req.session.error = 'Failed to load users.';
        res.redirect('/admin');
    }
};

exports.renderCreateUser = (req, res) => res.render('user_form', { editUser: null });

exports.createUser = async (req, res) => {
    try {
        const { name, email, password, role, status } = req.body;
        const existing = await User.findOne({ email });
        if (existing) {
            req.session.error = 'Email already exists.';
            return res.redirect('/admin/users/create');
        }
        await User.create({ name, email, password, role, status });
        req.session.success = 'User created successfully.';
        res.redirect('/admin/users');
    } catch (error) {
        console.error(error);
        req.session.error = 'Failed to create user.';
        res.redirect('/admin/users');
    }
};

exports.renderEditUser = async (req, res) => {
    try {
        const editUser = await User.findById(req.params.id);
        if (!editUser) return res.redirect('/admin/users');
        res.render('user_form', { editUser });
    } catch (error) {
        res.redirect('/admin/users');
    }
};

exports.updateUser = async (req, res) => {
    try {
        const { name, email, role, status, password } = req.body;
        const updateData = { name, email, role, status };
        if (password && password.trim() !== '') {
            const salt = await bcrypt.genSalt(10);
            updateData.password = await bcrypt.hash(password, salt);
        }
        await User.findByIdAndUpdate(req.params.id, updateData);
        req.session.success = 'User updated successfully.';
        res.redirect('/admin/users');
    } catch (error) {
        console.error(error);
        req.session.error = 'Failed to update user.';
        res.redirect('/admin/users');
    }
};

exports.deleteUser = async (req, res) => {
    try {
        if (req.params.id === req.session.user.id) {
            req.session.error = 'Cannot delete currently logged in administrator.';
            return res.redirect('/admin/users');
        }
        await User.findByIdAndDelete(req.params.id);
        req.session.success = 'User deleted successfully.';
        res.redirect('/admin/users');
    } catch (error) {
        console.error(error);
        req.session.error = 'Failed to delete user.';
        res.redirect('/admin/users');
    }
};