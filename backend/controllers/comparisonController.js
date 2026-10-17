const fs = require('fs');
const path = require('path');

exports.getComparisonData = (req, res) => {
    try {
        const resultsDir = path.join(__dirname, '..', 'dip_engine', 'results');
        const compPath = path.join(resultsDir, 'model_comparison.json');
        const mlPath = path.join(resultsDir, 'ml_metrics.json');
        const manualPath = path.join(resultsDir, 'manual_metrics.json');

        let comparisonData = null;
        let mlMetrics = null;
        let manualMetrics = null;

        if (fs.existsSync(compPath)) {
            try {
                comparisonData = JSON.parse(fs.readFileSync(compPath, 'utf8'));
            } catch (e) {
                console.error('Error parsing model_comparison.json:', e);
            }
        }

        if (fs.existsSync(mlPath)) {
            try {
                mlMetrics = JSON.parse(fs.readFileSync(mlPath, 'utf8'));
            } catch (e) {
                console.error('Error parsing ml_metrics.json:', e);
            }
        }

        if (fs.existsSync(manualPath)) {
            try {
                manualMetrics = JSON.parse(fs.readFileSync(manualPath, 'utf8'));
            } catch (e) {
                console.error('Error parsing manual_metrics.json:', e);
            }
        }

        res.json({
            success: true,
            comparisonData,
            mlMetrics,
            manualMetrics
        });
    } catch (error) {
        console.error('Error loading comparison data:', error);
        res.status(500).json({ success: false, message: 'Failed to load comparison data.' });
    }
};
