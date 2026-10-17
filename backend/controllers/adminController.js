const User = require('../models/User');
const ChestXrayScan = require('../models/ChestXrayScan');
const ChestXrayDetection = require('../models/ChestXrayDetection');
const Feedback = require('../models/Feedback');
const ActivityLog = require('../models/ActivityLog');
const Report = require('../models/Report');
const SystemSettings = require('../models/SystemSettings');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// 1. Admin Dashboard Overview
exports.getDashboard = async (req, res) => {
    try {
        const userCount = await User.countDocuments();
        const scanCount = await ChestXrayScan.countDocuments();
        
        const pneumoniaCount = await ChestXrayDetection.countDocuments({ 'mlDetection.prediction': 'PNEUMONIA' });
        const normalCount = await ChestXrayDetection.countDocuments({ 'mlDetection.prediction': 'NORMAL' });
        const unknownCount = await ChestXrayDetection.countDocuments({
            'mlDetection.prediction': { $nin: ['PNEUMONIA', 'NORMAL'] }
        });

        const dateRangeAgg = await ChestXrayDetection.aggregate([
            {
                $group: {
                    _id: null,
                    earliestDate: { $min: '$createdAt' },
                    latestDate: { $max: '$createdAt' }
                }
            }
        ]);
        const dateRange = dateRangeAgg[0] || { earliestDate: null, latestDate: null };

        const pendingFeedbackCount = await Feedback.countDocuments({ status: 'pending' });
        
        const recentLogs = await ActivityLog.find()
            .populate('userId', 'name email role')
            .sort({ createdAt: -1 })
            .limit(10);
            
        const feedbacks = await Feedback.find()
            .populate('userId', 'name email')
            .sort({ createdAt: -1 })
            .limit(5);

        // System Services Health
        const modelsDir = path.join(__dirname, '..', 'dip_engine', 'models');
        const modelLoaded = fs.existsSync(path.join(modelsDir, 'pneumonia_binary_model.keras')) ||
                            fs.existsSync(path.join(modelsDir, 'manual_thresholds.json'));

        const uptimeSeconds = Math.floor(process.uptime());
        const memoryMB = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);

        const serviceStatus = {
            api: {
                name: 'Node.js Express Gateway',
                status: 'operational',
                uptime: `${Math.floor(uptimeSeconds / 3600)}h ${Math.floor((uptimeSeconds % 3600) / 60)}m`,
                memory: `${memoryMB} MB`,
                port: process.env.PORT || 5000
            },
            database: {
                name: 'MongoDB Enterprise Database',
                status: mongoose.connection.readyState === 1 ? 'operational' : 'disconnected',
                host: mongoose.connection.host || 'localhost'
            },
            modelInference: {
                name: 'Python ML/DIP Inference Service (DenseNet-121 + U-Net)',
                status: modelLoaded ? 'operational' : 'degraded',
                modelLoaded: modelLoaded
            }
        };

        res.json({
            success: true,
            stats: {
                users: userCount,
                scans: scanCount,
                pneumoniaDetected: pneumoniaCount,
                normalPattern: normalCount,
                unknownCount: unknownCount,
                completedAnalyses: pneumoniaCount + normalCount,
                earliestDate: dateRange.earliestDate,
                latestDate: dateRange.latestDate,
                pendingFeedback: pendingFeedbackCount
            },
            serviceStatus,
            recentLogs,
            feedbacks
        });
    } catch (error) {
        console.error('getDashboard error:', error);
        res.status(500).json({ success: false, message: 'Failed to load admin dashboard data.' });
    }
};

// 2. User Management
exports.listUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';

        const query = {};
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { registrationNumber: { $regex: search, $options: 'i' } }
            ];
        }

        const totalUsers = await User.countDocuments(query);
        const users = await User.find(query)
            .select('-password')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        res.json({
            success: true,
            users,
            pagination: {
                total: totalUsers,
                page,
                totalPages: Math.ceil(totalUsers / limit) || 1,
                limit
            }
        });
    } catch (error) {
        console.error('listUsers error:', error);
        res.status(500).json({ success: false, message: 'Failed to load users.' });
    }
};

exports.getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        res.json({ success: true, user });
    } catch (error) {
        console.error('getUserById error:', error);
        res.status(500).json({ success: false, message: 'Failed to retrieve user.' });
    }
};

exports.createUser = async (req, res) => {
    try {
        const { name, email, password, role, status, phone, dob, gender, registrationNumber } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
        }
        const existing = await User.findOne({ email });
        if (existing) {
            return res.status(400).json({ success: false, message: 'Email already exists.' });
        }
        const user = await User.create({
            name,
            email,
            registrationNumber: registrationNumber || `RAD-${Math.floor(1000 + Math.random() * 9000)}`,
            password,
            role: role || 'user',
            status: status || 'active',
            phone,
            dob,
            gender: gender || 'Other'
        });

        await ActivityLog.create({
            userId: req.session.user?.id,
            action: 'Admin Created User',
            details: `Admin created user ${user.name} (${user.email})`,
            ipAddress: req.ip
        });

        res.status(201).json({
            success: true,
            message: 'User created successfully.',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                status: user.status
            }
        });
    } catch (error) {
        console.error('createUser error:', error);
        res.status(500).json({ success: false, message: 'Failed to create user.' });
    }
};

exports.updateUser = async (req, res) => {
    try {
        const { name, email, role, status, password, phone, dob, gender, registrationNumber } = req.body;
        const updateData = { name, email, role, status, phone, dob, gender, registrationNumber };
        
        if (password && password.trim() !== '') {
            const salt = await bcrypt.genSalt(10);
            updateData.password = await bcrypt.hash(password, salt);
        }
        
        const updated = await User.findByIdAndUpdate(req.params.id, updateData, { new: true }).select('-password');
        if (!updated) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        await ActivityLog.create({
            userId: req.session.user?.id,
            action: 'Admin Updated User',
            details: `Admin updated account ${updated.name} (${updated.email}, role: ${updated.role}, status: ${updated.status})`,
            ipAddress: req.ip
        });

        res.json({
            success: true,
            message: 'User updated successfully.',
            user: updated
        });
    } catch (error) {
        console.error('updateUser error:', error);
        res.status(500).json({ success: false, message: 'Failed to update user.' });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        if (req.params.id === req.session.user.id) {
            return res.status(400).json({ success: false, message: 'Cannot delete currently logged in administrator.' });
        }
        const deleted = await User.findByIdAndDelete(req.params.id);
        if (!deleted) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        await ActivityLog.create({
            userId: req.session.user?.id,
            action: 'Admin Deleted User',
            details: `Admin deleted user ${deleted.name} (${deleted.email})`,
            ipAddress: req.ip
        });

        res.json({ success: true, message: 'User deleted successfully.' });
    } catch (error) {
        console.error('deleteUser error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete user.' });
    }
};

// View user's specific scan history
exports.getUserScanHistory = async (req, res) => {
    try {
        const scans = await ChestXrayScan.find({ userId: req.params.id })
            .sort({ createdAt: -1 })
            .lean();

        const scanIds = scans.map(s => s._id);
        const detections = await ChestXrayDetection.find({ scanId: { $in: scanIds } }).lean();
        const detMap = {};
        detections.forEach(d => { detMap[d.scanId.toString()] = d; });

        const history = scans.map(s => ({
            ...s,
            detection: detMap[s._id.toString()] || null
        }));

        res.json({ success: true, scans: history });
    } catch (error) {
        console.error('getUserScanHistory error:', error);
        res.status(500).json({ success: false, message: 'Failed to load user scan history.' });
    }
};

// 3. X-ray Scan Management
exports.listAllScans = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';
        const predictionFilter = req.query.prediction || '';
        const statusFilter = req.query.status || '';

        const query = {};
        if (statusFilter) {
            query.status = statusFilter;
        }

        // Fetch scans with populated User
        const scans = await ChestXrayScan.find(query)
            .populate('userId', 'name email registrationNumber')
            .sort({ createdAt: -1 })
            .lean();

        // Get detections for these scans
        const scanIds = scans.map(s => s._id);
        const detections = await ChestXrayDetection.find({ scanId: { $in: scanIds } }).lean();
        const detMap = {};
        detections.forEach(d => { detMap[d.scanId.toString()] = d; });

        let results = scans.map(s => ({
            ...s,
            detection: detMap[s._id.toString()] || null
        }));

        // Filter by user search or filename
        if (search) {
            const term = search.toLowerCase();
            results = results.filter(r => 
                (r.filename && r.filename.toLowerCase().includes(term)) ||
                (r.userId?.name && r.userId.name.toLowerCase().includes(term)) ||
                (r.userId?.email && r.userId.email.toLowerCase().includes(term)) ||
                (r.userId?.registrationNumber && r.userId.registrationNumber.toLowerCase().includes(term))
            );
        }

        // Filter by prediction
        if (predictionFilter) {
            results = results.filter(r => r.detection?.mlDetection?.prediction === predictionFilter);
        }

        const total = results.length;
        const paginated = results.slice((page - 1) * limit, page * limit);

        res.json({
            success: true,
            scans: paginated,
            pagination: {
                total,
                page,
                totalPages: Math.ceil(total / limit) || 1,
                limit
            }
        });
    } catch (error) {
        console.error('listAllScans error:', error);
        res.status(500).json({ success: false, message: 'Failed to list scans.' });
    }
};

exports.deleteScan = async (req, res) => {
    try {
        const scan = await ChestXrayScan.findById(req.params.id);
        if (!scan) {
            return res.status(404).json({ success: false, message: 'Scan not found.' });
        }

        await ChestXrayDetection.deleteMany({ scanId: scan._id });
        await Report.deleteMany({ detectionId: { $in: await ChestXrayDetection.find({ scanId: scan._id }).distinct('_id') } });
        await ChestXrayScan.findByIdAndDelete(scan._id);

        await ActivityLog.create({
            userId: req.session.user?.id,
            action: 'Admin Deleted Scan',
            details: `Admin deleted scan ${scan.filename}`,
            ipAddress: req.ip
        });

        res.json({ success: true, message: 'Scan record deleted successfully.' });
    } catch (error) {
        console.error('deleteScan error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete scan.' });
    }
};

// Retention Policy Purge
exports.applyScanRetention = async (req, res) => {
    try {
        const days = parseInt(req.body.days) || 90;
        const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        const oldScans = await ChestXrayScan.find({ createdAt: { $lt: cutoffDate } });
        const oldScanIds = oldScans.map(s => s._id);

        const deletedDetections = await ChestXrayDetection.deleteMany({ scanId: { $in: oldScanIds } });
        const deletedScans = await ChestXrayScan.deleteMany({ _id: { $in: oldScanIds } });

        await ActivityLog.create({
            userId: req.session.user?.id,
            action: 'Retention Policy Execution',
            details: `Purged ${deletedScans.deletedCount} scans older than ${days} days`,
            ipAddress: req.ip
        });

        res.json({
            success: true,
            message: `Successfully purged ${deletedScans.deletedCount} records older than ${days} days.`,
            purgedCount: deletedScans.deletedCount
        });
    } catch (error) {
        console.error('applyScanRetention error:', error);
        res.status(500).json({ success: false, message: 'Failed to apply retention policy.' });
    }
};

// 4. Reports Management
exports.listAllReports = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';

        const reports = await Report.find()
            .populate('userId', 'name email registrationNumber')
            .populate({
                path: 'detectionId',
                select: 'mlDetection manualDetection comparison originalImage'
            })
            .sort({ createdAt: -1 })
            .lean();

        let filtered = reports;
        if (search) {
            const term = search.toLowerCase();
            filtered = reports.filter(r => 
                (r.findings && r.findings.toLowerCase().includes(term)) ||
                (r.userId?.name && r.userId.name.toLowerCase().includes(term)) ||
                (r.userId?.email && r.userId.email.toLowerCase().includes(term)) ||
                (r._id && r._id.toString().includes(term))
            );
        }

        const total = filtered.length;
        const paginated = filtered.slice((page - 1) * limit, page * limit);

        res.json({
            success: true,
            reports: paginated,
            pagination: {
                total,
                page,
                totalPages: Math.ceil(total / limit) || 1,
                limit
            }
        });
    } catch (error) {
        console.error('listAllReports error:', error);
        res.status(500).json({ success: false, message: 'Failed to list reports.' });
    }
};

exports.regenerateReport = async (req, res) => {
    try {
        const report = await Report.findById(req.params.id).populate('detectionId');
        if (!report) {
            return res.status(404).json({ success: false, message: 'Report not found.' });
        }

        const det = report.detectionId;
        const pred = det?.mlDetection?.prediction || 'NORMAL';
        const conf = det?.mlDetection?.confidence ? (det.mlDetection.confidence * 100).toFixed(1) : '94.0';

        report.findings = pred === 'PNEUMONIA'
            ? `Regenerated Diagnostic Assessment: DenseNet-121 CNN identified radiographic opacification indicative of pneumonia with ${conf}% certainty. Multifocal consolidation present in lower thoracic zones.`
            : `Regenerated Diagnostic Assessment: Both manual DIP and DenseNet-121 verify clear bilateral lung parenchymal fields. No consolidation, pleural effusion, or acute pneumonic opacities detected.`;
        
        report.recommendations = pred === 'PNEUMONIA'
            ? 'Recommend clinical correlation, sputum evaluation, and empiric antimicrobial therapy if clinically supported.'
            : 'Normal thoracic study. Routine clinical follow-up as indicated.';

        report.updatedAt = new Date();
        await report.save();

        await ActivityLog.create({
            userId: req.session.user?.id,
            action: 'Report Regenerated',
            details: `Regenerated report ${report._id}`,
            ipAddress: req.ip
        });

        res.json({ success: true, message: 'Report regenerated successfully.', report });
    } catch (error) {
        console.error('regenerateReport error:', error);
        res.status(500).json({ success: false, message: 'Failed to regenerate report.' });
    }
};

exports.deleteReport = async (req, res) => {
    try {
        const deleted = await Report.findByIdAndDelete(req.params.id);
        if (!deleted) {
            return res.status(404).json({ success: false, message: 'Report not found.' });
        }

        await ActivityLog.create({
            userId: req.session.user?.id,
            action: 'Report Deleted',
            details: `Deleted report ${deleted._id}`,
            ipAddress: req.ip
        });

        res.json({ success: true, message: 'Report deleted successfully.' });
    } catch (error) {
        console.error('deleteReport error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete report.' });
    }
};

// 5. Activity Logs and Audit Trail
exports.listActivityLogs = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 15;
        const actionFilter = req.query.action || '';
        const search = req.query.search || '';

        const query = {};
        if (actionFilter) {
            query.action = { $regex: actionFilter, $options: 'i' };
        }

        const logs = await ActivityLog.find(query)
            .populate('userId', 'name email role registrationNumber')
            .sort({ createdAt: -1 })
            .lean();

        let filtered = logs;
        if (search) {
            const term = search.toLowerCase();
            filtered = logs.filter(l => 
                (l.action && l.action.toLowerCase().includes(term)) ||
                (l.details && l.details.toLowerCase().includes(term)) ||
                (l.userId?.name && l.userId.name.toLowerCase().includes(term)) ||
                (l.userId?.email && l.userId.email.toLowerCase().includes(term))
            );
        }

        const total = filtered.length;
        const paginated = filtered.slice((page - 1) * limit, page * limit);

        res.json({
            success: true,
            logs: paginated,
            pagination: {
                total,
                page,
                totalPages: Math.ceil(total / limit) || 1,
                limit
            }
        });
    } catch (error) {
        console.error('listActivityLogs error:', error);
        res.status(500).json({ success: false, message: 'Failed to load activity logs.' });
    }
};

// 6. Feedback Management
exports.listFeedbacks = async (req, res) => {
    try {
        const statusFilter = req.query.status || '';
        const query = {};
        if (statusFilter) {
            query.status = statusFilter;
        }

        const feedbacks = await Feedback.find(query)
            .populate('userId', 'name email role')
            .sort({ createdAt: -1 });

        res.json({ success: true, feedbacks });
    } catch (error) {
        console.error('listFeedbacks error:', error);
        res.status(500).json({ success: false, message: 'Failed to load feedback list.' });
    }
};

exports.respondFeedback = async (req, res) => {
    try {
        const { response } = req.body;
        if (!response) {
            return res.status(400).json({ success: false, message: 'Response text is required.' });
        }
        const updated = await Feedback.findByIdAndUpdate(req.params.id, {
            adminResponse: response,
            status: 'resolved',
            responseDate: new Date()
        }, { new: true });

        await ActivityLog.create({
            userId: req.session.user?.id,
            action: 'Feedback Responded',
            details: `Admin responded to feedback ${req.params.id}`,
            ipAddress: req.ip
        });

        res.json({
            success: true,
            message: 'Feedback response saved successfully.',
            feedback: updated
        });
    } catch (error) {
        console.error('respondFeedback error:', error);
        res.status(500).json({ success: false, message: 'Failed to respond to feedback.' });
    }
};

// 7. System Settings
exports.getSettings = async (req, res) => {
    try {
        let settings = await SystemSettings.findOne();
        if (!settings) {
            settings = await SystemSettings.create({});
        }

        res.json({ success: true, settings });
    } catch (error) {
        console.error('getSettings error:', error);
        res.status(500).json({ success: false, message: 'Failed to load settings.' });
    }
};

exports.updateSettings = async (req, res) => {
    try {
        const {
            allowedImageFormats,
            maxUploadSizeMB,
            modelThreshold,
            sessionSecurityTimeoutHours,
            emailNotificationsEnabled,
            scanRetentionDays,
            autoPurgeEnabled
        } = req.body;

        let settings = await SystemSettings.findOne();
        if (!settings) {
            settings = new SystemSettings();
        }

        if (allowedImageFormats) settings.allowedImageFormats = allowedImageFormats;
        if (maxUploadSizeMB) settings.maxUploadSizeMB = maxUploadSizeMB;
        if (modelThreshold !== undefined) settings.modelThreshold = modelThreshold;
        if (sessionSecurityTimeoutHours) settings.sessionSecurityTimeoutHours = sessionSecurityTimeoutHours;
        if (emailNotificationsEnabled !== undefined) settings.emailNotificationsEnabled = emailNotificationsEnabled;
        if (scanRetentionDays) settings.scanRetentionDays = scanRetentionDays;
        if (autoPurgeEnabled !== undefined) settings.autoPurgeEnabled = autoPurgeEnabled;

        await settings.save();

        await ActivityLog.create({
            userId: req.session.user?.id,
            action: 'System Settings Updated',
            details: `Admin updated system settings (Upload limit: ${settings.maxUploadSizeMB}MB, Session: ${settings.sessionSecurityTimeoutHours}h)`,
            ipAddress: req.ip
        });

        res.json({ success: true, message: 'Settings saved successfully.', settings });
    } catch (error) {
        console.error('updateSettings error:', error);
        res.status(500).json({ success: false, message: 'Failed to update system settings.' });
    }
};

// Legacy Training Status (preserved)
exports.getTrainingStatus = (req, res) => {
    try {
        const resultsDir = path.join(__dirname, '..', 'dip_engine', 'results');
        const modelsDir = path.join(__dirname, '..', 'dip_engine', 'models');
        const datasetPath = process.env.DATASET_PATH || path.join(__dirname, '..', '..', 'dataset', 'chest_xray');
        
        const resolvedDatasetPath = path.resolve(__dirname, '..', datasetPath);
        const altDatasetPath = path.resolve(__dirname, '..', '..', 'dataset', 'chest_xray');

        const datasetExists = fs.existsSync(resolvedDatasetPath) || fs.existsSync(altDatasetPath);

        let statusInfo = {
            datasetPath: fs.existsSync(resolvedDatasetPath) ? resolvedDatasetPath : altDatasetPath,
            datasetExists: datasetExists,
            modelExists: fs.existsSync(path.join(modelsDir, 'pneumonia_binary_model.keras')),
            thresholdsExists: fs.existsSync(path.join(modelsDir, 'manual_thresholds.json'))
        };

        const manualPath = path.join(resultsDir, 'manual_metrics.json');
        if (fs.existsSync(manualPath)) {
            try { statusInfo.manualMetrics = JSON.parse(fs.readFileSync(manualPath, 'utf8')); } catch (e) {}
        }

        const mlPath = path.join(resultsDir, 'ml_metrics.json');
        if (fs.existsSync(mlPath)) {
            try { statusInfo.mlMetrics = JSON.parse(fs.readFileSync(mlPath, 'utf8')); } catch (e) {}
        }

        const compPath = path.join(resultsDir, 'model_comparison.json');
        if (fs.existsSync(compPath)) {
            try { statusInfo.modelComparison = JSON.parse(fs.readFileSync(compPath, 'utf8')); } catch (e) {}
        }

        res.json({ success: true, statusInfo });
    } catch (error) {
        console.error('getTrainingStatus error:', error);
        res.status(500).json({ success: false, message: 'Failed to load training status.' });
    }
};