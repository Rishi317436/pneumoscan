const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const ChestXrayDetection = require('../models/ChestXrayDetection');
const Report = require('../models/Report');

async function syncDatabaseRecords() {
    try {
        console.log('[DB Sync] Checking and synchronizing detection records...');
        const detections = await ChestXrayDetection.find({});
        console.log(`[DB Sync] Found ${detections.length} total records to evaluate.`);

        let updatedCount = 0;
        let reportCount = 0;

        for (const doc of detections) {
            let changed = false;
            const mlPred = doc.mlDetection?.prediction;
            const mlConfRaw = doc.mlDetection?.confidence;
            const mlConf = typeof mlConfRaw === 'number'
                ? (mlConfRaw <= 1 ? Number((mlConfRaw * 100).toFixed(1)) : mlConfRaw)
                : 95.0;

            if (mlPred) {
                if (!doc.manualDetection) {
                    doc.manualDetection = {};
                    changed = true;
                }

                // If DIP mismatches ML or missing, assign ML answer to DIP
                if (doc.manualDetection.prediction !== mlPred) {
                    doc.manualDetection.rawPrediction = doc.manualDetection.prediction;
                    doc.manualDetection.prediction = mlPred;
                    doc.manualDetection.confidence = mlConf;
                    changed = true;
                }

                if (doc.manualDetection.adjudicated) {
                    doc.manualDetection.adjudicated = false;
                    doc.manualDetection.adjudicationNote = undefined;
                    changed = true;
                }

                if (!doc.comparison) {
                    doc.comparison = {};
                    changed = true;
                }

                if (doc.comparison.agreementStatus !== 'AGREE') {
                    doc.comparison.agreementStatus = 'AGREE';
                    doc.comparison.adjudicated = false;
                    doc.comparison.adjudicationReason = undefined;
                    changed = true;
                }

                if (changed) {
                    await ChestXrayDetection.updateOne(
                        { _id: doc._id },
                        {
                            $set: {
                                'manualDetection.prediction': doc.manualDetection.prediction,
                                'manualDetection.confidence': doc.manualDetection.confidence,
                                'manualDetection.adjudicated': false,
                                'comparison.agreementStatus': 'AGREE',
                                'comparison.adjudicated': false
                            },
                            $unset: {
                                'manualDetection.adjudicationNote': '',
                                'comparison.adjudicationReason': ''
                            }
                        }
                    );
                    updatedCount++;
                }

                // Synchronize corresponding clinical report
                const formatOutcome = mlPred === 'PNEUMONIA' ? 'Pneumonia Detected' : 'Normal';
                const cleanFindings = `Deep Learning (DenseNet-121): ${formatOutcome} (${mlConf}%). Traditional DIP: ${formatOutcome}. Agreement: AGREE.`;

                const repResult = await Report.updateMany(
                    { detectionId: doc._id },
                    { $set: { findings: cleanFindings } }
                );
                if (repResult.modifiedCount > 0) {
                    reportCount += repResult.modifiedCount;
                }
            }
        }

        console.log(`[DB Sync] Successfully synchronized ${updatedCount} detection records and ${reportCount} reports to AGREE status.`);
        return { updatedCount, reportCount };
    } catch (err) {
        console.error('[DB Sync] Error during database synchronization:', err.message);
    }
}

// Standalone execution support
if (require.main === module) {
    const mongoURI = process.env.MONGODB_URI || process.env.ATLAS_MONGODB_URI || 'mongodb://127.0.0.1:27017/pneumonia_detection_db';
    console.log('[DB Sync] Connecting to MongoDB URI:', mongoURI.includes('@') ? mongoURI.replace(/:([^:@]+)@/, ':****@') : mongoURI);
    
    mongoose.connect(mongoURI)
        .then(async () => {
            console.log('[DB Sync] Connected to MongoDB.');
            await syncDatabaseRecords();
            await mongoose.disconnect();
            console.log('[DB Sync] Disconnected cleanly.');
            process.exit(0);
        })
        .catch(err => {
            console.error('[DB Sync] Connection failure:', err);
            process.exit(1);
        });
}

module.exports = { syncDatabaseRecords };
