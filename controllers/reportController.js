const Report = require('../models/Report');
const ChestXrayDetection = require('../models/ChestXrayDetection');

exports.getReports = async (req, res) => {
    try {
        const reports = await Report.find({ userId: req.session.user.id }).populate('detectionId').sort({ createdAt: -1 });
        res.render('reports', { reports });
    } catch (error) {
        console.error(error);
        req.session.error = 'Failed to load reports.';
        res.redirect('/dashboard');
    }
};

exports.viewReport = async (req, res) => {
    try {
        const report = await Report.findOne({ _id: req.params.id, userId: req.session.user.id }).populate('detectionId');
        if (!report) {
            req.session.error = 'Report not found.';
            return res.redirect('/report');
        }
        report.downloadCount += 1;
        await report.save();
        
        // Use result_detail view and pass both report and result
        res.render('result_detail', { result: report.detectionId, report });
    } catch (error) {
        console.error(error);
        req.session.error = 'Failed to view report.';
        res.redirect('/report');
    }
};