const Report = require('../models/Report');

exports.getReports = async (req, res) => {
    try {
        const query = req.session.user.role === 'admin' ? {} : { userId: req.session.user.id };
        const reports = await Report.find(query)
            .populate({
                path: 'detectionId',
                select: 'originalImage gradcamImage mlDetection manualDetection comparison createdAt scanId',
                populate: { path: 'scanId', select: 'filename imageSize' }
            })
            .sort({ createdAt: -1 })
            .lean();

        res.json({ success: true, reports });
    } catch (error) {
        console.error('getReports error:', error);
        res.status(500).json({ success: false, message: 'Failed to load reports.' });
    }
};

exports.getReportById = async (req, res) => {
    try {
        const query = req.session.user.role === 'admin' ? { _id: req.params.id } : { _id: req.params.id, userId: req.session.user.id };
        const report = await Report.findOne(query)
            .populate({
                path: 'detectionId',
                populate: { path: 'scanId', select: 'filename imageSize' }
            });

        if (!report) {
            return res.status(404).json({ success: false, message: 'Report not found.' });
        }

        report.downloadCount = (report.downloadCount || 0) + 1;
        await report.save();

        res.json({ success: true, report });
    } catch (error) {
        console.error('getReportById error:', error);
        res.status(500).json({ success: false, message: 'Failed to retrieve report.' });
    }
};