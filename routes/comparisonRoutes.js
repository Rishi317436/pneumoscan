const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const fs = require('fs');
const path = require('path');

router.get('/', auth, (req, res) => {
    try {
        const compPath = path.join(__dirname, '..', 'dip_engine', 'results', 'model_comparison.json');
        let comparisonData = null;
        if (fs.existsSync(compPath)) {
            comparisonData = JSON.parse(fs.readFileSync(compPath, 'utf8'));
        }
        res.render('comparison', { comparisonData });
    } catch (error) {
        console.error(error);
        req.session.error = 'Failed to load comparison data.';
        res.redirect('/dashboard');
    }
});

module.exports = router;
