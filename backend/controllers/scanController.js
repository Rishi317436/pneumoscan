const ChestXrayScan = require('../models/ChestXrayScan');
const ChestXrayDetection = require('../models/ChestXrayDetection');
const ActivityLog = require('../models/ActivityLog');
const Report = require('../models/Report');
const Notification = require('../models/Notification');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

exports.postUpload = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Please select a chest X-ray image to upload.' });
        }

        const scan = new ChestXrayScan({
            userId: req.session.user.id,
            imagePath: req.file.path,
            imageFormat: req.file.mimetype,
            imageSize: req.file.size,
            filename: req.file.filename,
            description: req.body.description || 'Uploaded for pneumonia detection',
            status: 'processing'
        });
        await scan.save();

        await ActivityLog.create({
            userId: req.session.user.id,
            action: 'Chest X-Ray Upload',
            details: `Uploaded radiograph: ${req.file.filename} (${(req.file.size / (1024 * 1024)).toFixed(2)} MB)`,
            ipAddress: req.ip
        });

        let pythonPath = process.env.PYTHON_PATH || (process.platform === 'win32' ? 'python' : 'python3');
        let detectScript = path.join(__dirname, '..', '..', 'dip_engine', 'detect_pneumonia.py');
        if (!fs.existsSync(detectScript)) {
            detectScript = path.join(__dirname, '..', 'dip_engine', 'detect_pneumonia.py');
        }
        if (!fs.existsSync(detectScript)) {
            detectScript = path.join(process.cwd(), 'dip_engine', 'detect_pneumonia.py');
        }
        let imgPath = path.resolve(req.file.path);
        let scriptCwd = path.dirname(detectScript);

        if (pythonPath.includes('wsl')) {
            let cleanScript = detectScript.replace(/\\/g, '/');
            if (/^[a-zA-Z]:/.test(cleanScript)) {
                const drive = cleanScript[0].toLowerCase();
                detectScript = `/mnt/${drive}${cleanScript.substring(2)}`;
            } else {
                detectScript = cleanScript;
            }

            let cleanImg = imgPath.replace(/\\/g, '/');
            if (/^[a-zA-Z]:/.test(cleanImg)) {
                const drive = cleanImg[0].toLowerCase();
                imgPath = `/mnt/${drive}${cleanImg.substring(2)}`;
            } else {
                imgPath = cleanImg;
            }
        }

        const cmd = `${pythonPath} "${detectScript}" "${imgPath}"`;
        console.log(`Executing DIP engine: ${cmd}`);

        const execOptions = {
            maxBuffer: 50 * 1024 * 1024,
            cwd: scriptCwd,
            env: {
                ...process.env,
                PYTHONPATH: `${scriptCwd}${path.delimiter}${path.dirname(scriptCwd)}${path.delimiter}${process.env.PYTHONPATH || ''}`
            }
        };

        exec(cmd, execOptions, async (error, stdout, stderr) => {
            if (error) {
                console.error(`Exec Error: ${error.message}`, stderr);
                scan.status = 'failed';
                await scan.save();
                return res.status(500).json({
                    success: false,
                    message: 'Processing failed during DenseNet-121 model execution.',
                    error: error.message
                });
            }

            try {
                // Parse the last valid JSON in stdout
                const lines = stdout.trim().split('\n');
                let pyResult = null;
                for (let i = lines.length - 1; i >= 0; i--) {
                    const line = lines[i].trim();
                    if (line.startsWith('{') && line.endsWith('}')) {
                        try {
                            pyResult = JSON.parse(line);
                            break;
                        } catch (e) {}
                    }
                }

                if (!pyResult) {
                    pyResult = JSON.parse(stdout);
                }

                const webOriginalImage = `/uploads/${req.file.filename}`;
                const detection = new ChestXrayDetection({
                    user: req.session.user.id,
                    userId: req.session.user.id,
                    scanId: scan._id,
                    originalImage: webOriginalImage,
                    processedImage: pyResult.processedImage ? pyResult.processedImage.replace(/\\/g, '/') : '',
                    gradcamImage: pyResult.gradcamImage ? pyResult.gradcamImage.replace(/\\/g, '/') : '',
                    manualDetection: pyResult.manualDetection,
                    mlDetection: pyResult.mlDetection,
                    comparison: pyResult.comparison,
                    clinicalInformation: {
                        symptoms: req.body.symptoms || '',
                        recentHospitalization: req.body.recentHospitalization === true || req.body.recentHospitalization === 'true' || req.body.recentHospitalization === 'on',
                        timeSinceAdmission: req.body.timeSinceAdmission || 'N/A',
                        mechanicalVentilation: req.body.mechanicalVentilation === true || req.body.mechanicalVentilation === 'true' || req.body.mechanicalVentilation === 'on',
                        aspirationHistory: req.body.aspirationHistory === true || req.body.aspirationHistory === 'true' || req.body.aspirationHistory === 'on',
                        otherInfo: req.body.otherInfo || ''
                    }
                });
                await detection.save();

                const manPred = pyResult.manualDetection?.prediction || 'N/A';
                const manScore = typeof pyResult.manualDetection?.score === 'number' ? pyResult.manualDetection.score.toFixed(1) + '%' : 'N/A';
                const mlPred = pyResult.mlDetection?.prediction || 'N/A';
                const mlConf = typeof pyResult.mlDetection?.confidence === 'number' ? (pyResult.mlDetection.confidence * 100).toFixed(1) + '%' : 'N/A';
                const agree = pyResult.comparison?.agreementStatus || 'N/A';

                const report = new Report({
                    detectionId: detection._id,
                    userId: req.session.user.id,
                    findings: `Deep Learning (DenseNet-121): ${mlPred} (Confidence: ${mlConf}). Traditional DIP Analysis: ${manPred}. Agreement: ${agree}.`,
                    recommendations: 'Results are for computational comparison and research assistance. Consult with a qualified physician or radiologist for clinical diagnosis.'
                });
                await report.save();

                scan.status = 'processed';
                await scan.save();

                res.status(201).json({
                    success: true,
                    message: 'Scan analyzed successfully via multi-method pipeline.',
                    detectionId: detection._id,
                    detection,
                    report
                });
            } catch (parseError) {
                console.error(`Parse Error: ${parseError.message}`, stdout);
                scan.status = 'failed';
                await scan.save();
                res.status(500).json({
                    success: false,
                    message: 'Failed to parse processing results from DIP engine.',
                    error: parseError.message
                });
            }
        });
    } catch (error) {
        console.error('postUpload error:', error);
        res.status(500).json({ success: false, message: 'An error occurred during upload.' });
    }
};

// High performance paginated & filtered worklist queries
exports.getResults = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 12));
        const skip = (page - 1) * limit;

        const userFilter = { $or: [{ user: req.session.user.id }, { userId: req.session.user.id }] };
        const filter = req.session.user.role === 'admin' ? {} : userFilter;

        // Prediction filter
        if (req.query.prediction && ['NORMAL', 'PNEUMONIA'].includes(req.query.prediction.toUpperCase())) {
            filter['mlDetection.prediction'] = req.query.prediction.toUpperCase();
        }

        // Agreement filter
        if (req.query.agreement && ['AGREE', 'DISAGREE'].includes(req.query.agreement.toUpperCase())) {
            filter['comparison.agreementStatus'] = req.query.agreement.toUpperCase();
        }

        // Search query
        if (req.query.search) {
            const regex = new RegExp(req.query.search, 'i');
            const matchingScans = await ChestXrayScan.find({ filename: regex }).select('_id').lean();
            const scanIds = matchingScans.map(s => s._id);
            filter.$or = [
                { originalImage: regex },
                { scanId: { $in: scanIds } },
                { 'clinicalInformation.symptoms': regex }
            ];
        }

        const [total, detections] = await Promise.all([
            ChestXrayDetection.countDocuments(filter),
            ChestXrayDetection.find(filter)
                .select('originalImage gradcamImage mlDetection manualDetection comparison clinicalInformation createdAt scanId user userId')
                .populate('scanId', 'filename imageSize status')
                .populate('user', 'name email')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean()
        ]);

        res.json({
            success: true,
            results: detections,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit) || 1
            }
        });
    } catch (error) {
        console.error('getResults error:', error);
        res.status(500).json({ success: false, message: 'Failed to load radiology study worklist.' });
    }
};

exports.getDetail = async (req, res) => {
    try {
        const query = req.session.user.role === 'admin' 
            ? { _id: req.params.id } 
            : { _id: req.params.id, $or: [{ user: req.session.user.id }, { userId: req.session.user.id }] };
        const detection = await ChestXrayDetection.findOne(query)
            .populate('scanId')
            .populate('user', 'name email')
            .lean();

        if (!detection) {
            return res.status(404).json({ success: false, message: 'Radiology study record not found.' });
        }

        res.json({ success: true, detection });
    } catch (error) {
        console.error('getDetail error:', error);
        res.status(500).json({ success: false, message: 'Failed to load study details.' });
    }
};

exports.deleteScan = async (req, res) => {
    try {
        const query = req.session.user.role === 'admin' 
            ? { _id: req.params.id } 
            : { _id: req.params.id, $or: [{ user: req.session.user.id }, { userId: req.session.user.id }] };
        const detection = await ChestXrayDetection.findOne(query);

        if (!detection) {
            return res.status(404).json({ success: false, message: 'Study not found or unauthorized.' });
        }

        // Clean up files safely
        if (detection.originalImage) {
            const fullOrigPath = path.resolve(__dirname, '..', detection.originalImage);
            if (fs.existsSync(fullOrigPath)) {
                try { fs.unlinkSync(fullOrigPath); } catch (e) {}
            }
        }
        if (detection.gradcamImage) {
            const fullGradPath = path.resolve(__dirname, '..', detection.gradcamImage);
            if (fs.existsSync(fullGradPath)) {
                try { fs.unlinkSync(fullGradPath); } catch (e) {}
            }
        }

        // Cascade delete Scan and Report
        if (detection.scanId) {
            await ChestXrayScan.findByIdAndDelete(detection.scanId);
        }
        await Report.deleteMany({ detectionId: detection._id });
        await ChestXrayDetection.findByIdAndDelete(detection._id);

        res.json({ success: true, message: 'Radiology study deleted successfully.' });
    } catch (error) {
        console.error('deleteScan error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete study record.' });
    }
};