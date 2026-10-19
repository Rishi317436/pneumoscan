const ChestXrayScan = require('../models/ChestXrayScan');
const ChestXrayDetection = require('../models/ChestXrayDetection');
const ActivityLog = require('../models/ActivityLog');
const Report = require('../models/Report');
const Notification = require('../models/Notification');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { exec } = require('child_process');
const { uploadBufferToGridFS, deleteGridFSFile } = require('../config/gridfs');

// Helper to find Python detect script path
function resolveDetectScript() {
    const candidates = [
        path.join(__dirname, '..', '..', 'dip_engine', 'detect_pneumonia.py'),
        path.join(__dirname, '..', 'dip_engine', 'detect_pneumonia.py'),
        path.join(process.cwd(), 'dip_engine', 'detect_pneumonia.py'),
        path.join(process.cwd(), 'backend', 'dip_engine', 'detect_pneumonia.py')
    ];
    for (const p of candidates) {
        if (fs.existsSync(p)) return p;
    }
    return candidates[0];
}

// Background worker for non-blocking ML and DIP analysis
async function processScanInBackground(scan, fileBuffer, userId, bodyData, originalFilename, gridfsFileId) {
    const tempFileName = `xray_${Date.now()}_${path.basename(originalFilename).replace(/[^a-zA-Z0-9._-]/g, '')}`;
    const tempFilePath = path.join(os.tmpdir(), tempFileName);

    try {
        // 1. Write buffer to temporary file for Python processing
        fs.writeFileSync(tempFilePath, fileBuffer);

        let pythonPath = process.env.PYTHON_PATH || (process.platform === 'win32' ? 'python' : 'python3');
        let detectScript = resolveDetectScript();
        let scriptCwd = path.dirname(detectScript);
        let imgPath = path.resolve(tempFilePath);

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
        console.log(`[Worker] Executing DIP engine: ${cmd}`);

        const execOptions = {
            maxBuffer: 50 * 1024 * 1024,
            cwd: scriptCwd,
            env: {
                ...process.env,
                TF_ENABLE_ONEDNN_OPTS: '0',
                TF_CPP_MIN_LOG_LEVEL: '3',
                OMP_NUM_THREADS: '1',
                TF_NUM_INTRAOP_THREADS: '1',
                TF_NUM_INTEROP_THREADS: '1',
                MALLOC_TRIM_THRESHOLD_: '65536',
                PYTHONPATH: `${scriptCwd}${path.delimiter}${path.dirname(scriptCwd)}${path.delimiter}${process.env.PYTHONPATH || ''}`
            }
        };

        exec(cmd, execOptions, async (error, stdout, stderr) => {
            // Clean up temporary image file immediately
            try { if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath); } catch (e) {}

            if (error) {
                console.error(`[Worker] Exec Error: ${error.message}`, stderr);
                scan.status = 'failed';
                await scan.save();
                return;
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

                // 2. Persist Grad-CAM overlay image to MongoDB GridFS
                let gradcamUrl = '';
                if (pyResult.gradcamImage) {
                    const localGradcamPath = path.resolve(scriptCwd, '..', pyResult.gradcamImage.replace(/^\//, ''));
                    const altGradcamPath = path.resolve(scriptCwd, pyResult.gradcamImage.replace(/^\//, ''));
                    const targetGradPath = fs.existsSync(localGradcamPath) ? localGradcamPath : (fs.existsSync(altGradcamPath) ? altGradcamPath : null);

                    if (targetGradPath) {
                        try {
                            const gradcamBuffer = fs.readFileSync(targetGradPath);
                            const gradcamId = await uploadBufferToGridFS(gradcamBuffer, `gradcam_${tempFileName}.png`, 'image/png');
                            gradcamUrl = `/api/images/${gradcamId}`;
                            try { fs.unlinkSync(targetGradPath); } catch (e) {}
                        } catch (e) {
                            console.warn('[Worker] Could not store Grad-CAM to GridFS:', e.message);
                            gradcamUrl = pyResult.gradcamImage;
                        }
                    } else {
                        gradcamUrl = pyResult.gradcamImage;
                    }
                }

                // 3. Persist Zone Overlay to MongoDB GridFS if present
                if (pyResult.manualDetection?.zoneOverlayImage) {
                    const localZonePath = path.resolve(scriptCwd, '..', pyResult.manualDetection.zoneOverlayImage.replace(/^\//, ''));
                    const altZonePath = path.resolve(scriptCwd, pyResult.manualDetection.zoneOverlayImage.replace(/^\//, ''));
                    const targetZone = fs.existsSync(localZonePath) ? localZonePath : (fs.existsSync(altZonePath) ? altZonePath : null);

                    if (targetZone) {
                        try {
                            const zoneBuf = fs.readFileSync(targetZone);
                            const zoneId = await uploadBufferToGridFS(zoneBuf, `zone_${tempFileName}.png`, 'image/png');
                            pyResult.manualDetection.zoneOverlayImage = `/api/images/${zoneId}`;
                            try { fs.unlinkSync(targetZone); } catch (e) {}
                        } catch (e) {
                            console.warn('[Worker] Could not store Zone Overlay to GridFS:', e.message);
                        }
                    }
                }

                const originalImageUrl = `/api/images/${gridfsFileId}`;

                const detection = new ChestXrayDetection({
                    user: userId,
                    userId: userId,
                    scanId: scan._id,
                    originalImage: originalImageUrl,
                    processedImage: pyResult.processedImage || '',
                    gradcamImage: gradcamUrl,
                    manualDetection: pyResult.manualDetection,
                    mlDetection: pyResult.mlDetection,
                    comparison: pyResult.comparison,
                    clinicalInformation: {
                        symptoms: bodyData.symptoms || '',
                        recentHospitalization: bodyData.recentHospitalization === true || bodyData.recentHospitalization === 'true' || bodyData.recentHospitalization === 'on',
                        timeSinceAdmission: bodyData.timeSinceAdmission || 'N/A',
                        mechanicalVentilation: bodyData.mechanicalVentilation === true || bodyData.mechanicalVentilation === 'true' || bodyData.mechanicalVentilation === 'on',
                        aspirationHistory: bodyData.aspirationHistory === true || bodyData.aspirationHistory === 'true' || bodyData.aspirationHistory === 'on',
                        otherInfo: bodyData.otherInfo || ''
                    }
                });
                await detection.save();

                const manPred = pyResult.manualDetection?.prediction || 'N/A';
                const mlPred = pyResult.mlDetection?.prediction || 'N/A';
                const mlConf = typeof pyResult.mlDetection?.confidence === 'number' ? (pyResult.mlDetection.confidence * 100).toFixed(1) + '%' : 'N/A';
                const agree = pyResult.comparison?.agreementStatus || 'N/A';

                const formatClinicalOutcome = (p) => {
                    if (!p) return 'N/A';
                    const u = String(p).toUpperCase();
                    if (u === 'PNEUMONIA' || u.includes('PNEUMONIA')) return 'Pneumonia Suspected — Further Clinical Evaluation Required';
                    if (u === 'NORMAL') return 'Normal';
                    return p;
                };

                const report = new Report({
                    detectionId: detection._id,
                    userId: userId,
                    findings: `Deep Learning (DenseNet-121): ${formatClinicalOutcome(mlPred)} (Confidence: ${mlConf}). Traditional DIP Analysis: ${formatClinicalOutcome(manPred)}. Agreement: ${agree}.`,
                    recommendations: 'Results are for computational comparison and research assistance. Consult with a qualified physician or radiologist for clinical diagnosis.'
                });
                await report.save();

                scan.status = 'processed';
                await scan.save();
                console.log(`[Worker] Scan ${scan._id} processed and saved to MongoDB Atlas cleanly.`);
            } catch (parseError) {
                console.error(`[Worker] Parse Error: ${parseError.message}`, stdout);
                scan.status = 'failed';
                await scan.save();
            }
        });
    } catch (err) {
        console.error('[Worker] Fatal Error:', err);
        try { if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath); } catch (e) {}
        scan.status = 'failed';
        await scan.save();
    }
}

// Rapid Non-Blocking Upload Handler (< 400ms HTTP Response)
exports.postUpload = async (req, res) => {
    try {
        if (!req.file || !req.file.buffer) {
            return res.status(400).json({ success: false, message: 'Please select a chest X-ray image to upload.' });
        }

        // 1. Immediately store the original radiograph binary into MongoDB Atlas GridFS
        const originalName = req.file.originalname || `xray_${Date.now()}.jpeg`;
        const mimeType = req.file.mimetype || 'image/jpeg';
        const gridfsId = await uploadBufferToGridFS(req.file.buffer, originalName, mimeType);
        const imageUrl = `/api/images/${gridfsId}`;

        // 2. Persist the Scan document in MongoDB
        const scan = new ChestXrayScan({
            userId: req.session.user.id,
            user: req.session.user.id,
            imagePath: imageUrl,
            imageFormat: mimeType,
            imageSize: req.file.size,
            filename: originalName,
            description: req.body.description || 'Uploaded for pneumonia detection',
            status: 'processing'
        });
        await scan.save();

        await ActivityLog.create({
            userId: req.session.user.id,
            action: 'Chest X-Ray Upload',
            details: `Uploaded radiograph: ${originalName} (${(req.file.size / (1024 * 1024)).toFixed(2)} MB) to Atlas GridFS`,
            ipAddress: req.ip
        });

        // 3. Immediately return HTTP 202 Accepted (< 400ms) to eliminate Render 60s gateway timeouts
        res.status(202).json({
            success: true,
            status: 'processing',
            message: 'Radiograph securely mounted in MongoDB Atlas. Analysis executing in background...',
            scanId: scan._id,
            imagePath: imageUrl
        });

        // 4. Trigger asynchronous background analysis without holding the HTTP connection
        processScanInBackground(scan, req.file.buffer, req.session.user.id, req.body, originalName, gridfsId);

    } catch (error) {
        console.error('postUpload error:', error);
        res.status(500).json({ success: false, message: 'An error occurred during upload: ' + error.message });
    }
};

// Polling endpoint for real-time analysis status
exports.getScanStatus = async (req, res) => {
    try {
        const scan = await ChestXrayScan.findById(req.params.id).lean();
        if (!scan) {
            return res.status(404).json({ success: false, message: 'Study scan record not found.' });
        }

        if (scan.status === 'processing') {
            return res.json({
                success: true,
                status: 'processing',
                scanId: scan._id,
                message: 'Analysis in progress...'
            });
        }

        if (scan.status === 'failed') {
            return res.json({
                success: false,
                status: 'failed',
                scanId: scan._id,
                message: 'Processing could not be completed on the radiograph.'
            });
        }

        // Status is 'processed': fetch detection and report
        const detection = await ChestXrayDetection.findOne({ scanId: scan._id })
            .populate('user', 'name email')
            .lean();

        const report = detection ? await Report.findOne({ detectionId: detection._id }).lean() : null;

        res.json({
            success: true,
            status: 'processed',
            scanId: scan._id,
            detection,
            report
        });
    } catch (error) {
        console.error('getScanStatus error:', error);
        res.status(500).json({ success: false, message: 'Failed to retrieve scan status.' });
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

        // Clean up GridFS files if referenced
        const extractGridId = (url) => {
            if (url && url.startsWith('/api/images/')) {
                return url.replace('/api/images/', '');
            }
            return null;
        };

        const origGridId = extractGridId(detection.originalImage);
        if (origGridId) await deleteGridFSFile(origGridId);

        const gradGridId = extractGridId(detection.gradcamImage);
        if (gradGridId) await deleteGridFSFile(gradGridId);

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