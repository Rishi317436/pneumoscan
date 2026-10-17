const ChestXrayScan = require('../models/ChestXrayScan');
const ChestXrayDetection = require('../models/ChestXrayDetection');
const ActivityLog = require('../models/ActivityLog');
const Report = require('../models/Report');
const Notification = require('../models/Notification');
const path = require('path');
const { exec } = require('child_process');

exports.getUpload = (req, res) => {
    res.render('upload');
};

exports.postUpload = async (req, res) => {
    try {
        if (!req.file) {
            req.session.error = 'Please select an image file to upload.';
            return res.redirect('/scan/upload');
        }

        const scan = new ChestXrayScan({
            userId: req.session.user.id,
            imagePath: req.file.path,
            imageFormat: req.file.mimetype,
            imageSize: req.file.size,
            filename: req.file.filename,
            description: req.body.description || 'Uploaded for detection',
            status: 'processing'
        });
        await scan.save();

        await ActivityLog.create({
            userId: req.session.user.id,
            action: 'Chest X-Ray Upload',
            details: `Uploaded file: ${req.file.filename}`,
            ipAddress: req.ip
        });

        let pythonPath = process.env.PYTHON_PATH || 'python';
        let detectScript = path.join(__dirname, '..', 'dip_engine', 'detect_pneumonia.py');
        let imgPath = path.resolve(req.file.path);

        if (pythonPath.includes('wsl')) {
            detectScript = detectScript.replace(/\\/g, '/');
            if (/^[a-zA-Z]:/.test(detectScript)) {
                const drive = detectScript[0].toLowerCase();
                detectScript = `/mnt/${drive}${detectScript.substring(2)}`;
            }
            imgPath = imgPath.replace(/\\/g, '/');
            if (/^[a-zA-Z]:/.test(imgPath)) {
                const drive = imgPath[0].toLowerCase();
                imgPath = `/mnt/${drive}${imgPath.substring(2)}`;
            }
        }

        const cmd = `${pythonPath} "${detectScript}" "${imgPath}"`;
        console.log(`Executing DIP engine: ${cmd}`);

        exec(cmd, async (error, stdout, stderr) => {
            if (error) {
                console.error(`Exec Error: ${error.message}`, stderr);
                scan.status = 'failed';
                await scan.save();
                req.session.error = 'Processing failed during execution.';
                return res.redirect('/scan/results');
            }

            try {
                // Find the first line that looks like valid JSON in stdout
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

                const detection = new ChestXrayDetection({
                    user: req.session.user.id,
                    scanId: scan._id,
                    originalImage: req.file.path,
                    processedImage: pyResult.processedImage,
                    gradcamImage: pyResult.gradcamImage,
                    manualDetection: pyResult.manualDetection,
                    mlDetection: pyResult.mlDetection,
                    comparison: pyResult.comparison,
                    clinicalInformation: {
                        symptoms: req.body.symptoms,
                        recentHospitalization: req.body.recentHospitalization === 'on',
                        timeSinceAdmission: req.body.timeSinceAdmission,
                        mechanicalVentilation: req.body.mechanicalVentilation === 'on',
                        aspirationHistory: req.body.aspirationHistory === 'on',
                        otherInfo: req.body.otherInfo
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
                    findings: `Deep Learning (DenseNet-121): ${mlPred} (Confidence: ${mlConf}). Traditional DIP Analysis: ${manPred} (Infiltration Score: ${manScore}). Agreement: ${agree}.`,
                    recommendations: 'Results are for computational comparison and research assistance. Consult with a qualified physician or radiologist for clinical diagnosis.'
                });
                await report.save();

                await Notification.create({
                    userId: req.session.user.id,
                    title: 'Detection Complete',
                    message: `Chest X-Ray analyzed. Deep Learning: ${mlPred} (${mlConf}), Traditional DIP: ${manPred}`,
                    link: `/scan/detail/${detection._id}`
                });

                scan.status = 'processed';
                await scan.save();

                req.session.success = 'Scan analyzed successfully via multi-method pipeline.';
                res.redirect(`/scan/detail/${detection._id}`);
            } catch (parseError) {
                console.error(`Parse Error: ${parseError.message}`, stdout);
                scan.status = 'failed';
                await scan.save();
                req.session.error = 'Failed to parse processing results.';
                res.redirect('/scan/results');
            }
        });
    } catch (error) {
        console.error(error);
        req.session.error = 'An error occurred during upload.';
        res.redirect('/scan/upload');
    }
};

exports.getResults = async (req, res) => {
    try {
        const detections = await ChestXrayDetection.find({ user: req.session.user.id }).populate('scanId').sort({ createdAt: -1 });
        res.render('result', { results: detections });
    } catch (error) {
        console.error(error);
        req.session.error = 'Failed to load results.';
        res.redirect('/dashboard');
    }
};

exports.getDetail = async (req, res) => {
    try {
        const detection = await ChestXrayDetection.findOne({ _id: req.params.id, user: req.session.user.id }).populate('scanId');
        if (!detection) {
            req.session.error = 'Result not found.';
            return res.redirect('/scan/results');
        }
        res.render('result_detail', { result: detection, report: null });
    } catch (error) {
        console.error(error);
        req.session.error = 'Failed to load details.';
        res.redirect('/scan/results');
    }
};