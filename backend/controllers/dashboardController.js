const mongoose = require('mongoose');
const ChestXrayDetection = require('../models/ChestXrayDetection');
const ChestXrayScan = require('../models/ChestXrayScan');

exports.getDashboardStats = async (req, res) => {
    try {
        const userId = req.session.user.role === 'admin' ? null : new mongoose.Types.ObjectId(req.session.user.id);
        const matchStage = userId ? { $or: [{ user: userId }, { userId: userId }] } : {};

        // Run fast parallel aggregation pipelines
        const [kpiStats, predictionDistribution, agreementDistribution, recentScans, weeklyTrend] = await Promise.all([
            // 1. Core KPIs
            ChestXrayDetection.aggregate([
                { $match: matchStage },
                {
                    $group: {
                        _id: null,
                        totalScans: { $sum: 1 },
                        pneumoniaCount: {
                            $sum: { $cond: [{ $eq: ['$mlDetection.prediction', 'PNEUMONIA'] }, 1, 0] }
                        },
                        normalCount: {
                            $sum: { $cond: [{ $eq: ['$mlDetection.prediction', 'NORMAL'] }, 1, 0] }
                        },
                        unknownCount: {
                            $sum: {
                                $cond: [
                                    { $not: { $in: ['$mlDetection.prediction', ['PNEUMONIA', 'NORMAL']] } },
                                    1,
                                    0
                                ]
                            }
                        },
                        agreeCount: {
                            $sum: { $cond: [{ $eq: ['$comparison.agreementStatus', 'AGREE'] }, 1, 0] }
                        },
                        disagreeCount: {
                            $sum: { $cond: [{ $eq: ['$comparison.agreementStatus', 'DISAGREE'] }, 1, 0] }
                        },
                        avgConfidence: { $avg: '$mlDetection.confidence' },
                        earliestDate: { $min: '$createdAt' },
                        latestDate: { $max: '$createdAt' }
                    }
                }
            ]),

            // 2. Prediction Breakdown
            ChestXrayDetection.aggregate([
                { $match: matchStage },
                { $group: { _id: '$mlDetection.prediction', count: { $sum: 1 } } }
            ]),

            // 3. Agreement Breakdown
            ChestXrayDetection.aggregate([
                { $match: matchStage },
                { $group: { _id: '$comparison.agreementStatus', count: { $sum: 1 } } }
            ]),

            // 4. Recent Scans (Fast projection with lean)
            ChestXrayDetection.find(matchStage)
                .select('originalImage gradcamImage mlDetection manualDetection comparison clinicalInformation createdAt scanId')
                .populate('scanId', 'filename imageSize')
                .sort({ createdAt: -1 })
                .limit(6)
                .lean(),

            // 5. 7-Day Activity Trend
            ChestXrayDetection.aggregate([
                {
                    $match: {
                        ...matchStage,
                        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
                    }
                },
                {
                    $group: {
                        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                        count: { $sum: 1 },
                        pneumonia: {
                            $sum: { $cond: [{ $eq: ['$mlDetection.prediction', 'PNEUMONIA'] }, 1, 0] }
                        }
                    }
                },
                { $sort: { _id: 1 } }
            ])
        ]);

        const stats = kpiStats[0] || {
            totalScans: 0,
            pneumoniaCount: 0,
            normalCount: 0,
            agreeCount: 0,
            disagreeCount: 0,
            avgConfidence: 0
        };

        const positivityRate = stats.totalScans > 0 ? (stats.pneumoniaCount / stats.totalScans) * 100 : 0;
        const concordanceRate = stats.totalScans > 0 ? (stats.agreeCount / stats.totalScans) * 100 : 0;

        res.json({
            success: true,
            summary: {
                totalScans: stats.totalScans,
                pneumoniaCount: stats.pneumoniaCount,
                normalCount: stats.normalCount,
                unknownCount: stats.unknownCount || 0,
                completedAnalyses: stats.pneumoniaCount + stats.normalCount,
                earliestDate: stats.earliestDate || null,
                latestDate: stats.latestDate || null,
                agreeCount: stats.agreeCount,
                disagreeCount: stats.disagreeCount,
                positivityRate: Number(positivityRate.toFixed(1)),
                concordanceRate: Number(concordanceRate.toFixed(1)),
                avgConfidence: Number((stats.avgConfidence <= 1 ? stats.avgConfidence * 100 : stats.avgConfidence).toFixed(1))
            },
            predictionDistribution,
            agreementDistribution,
            weeklyTrend,
            recentScans
        });
    } catch (error) {
        console.error('getDashboardStats aggregation error:', error);
        res.status(500).json({ success: false, message: 'Failed to aggregate dashboard analytics' });
    }
};
