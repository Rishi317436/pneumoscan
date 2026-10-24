const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const ChestXrayDetection = require('../models/ChestXrayDetection');
const ChestXrayScan = require('../models/ChestXrayScan');
const { SAMPLE_BENCHMARKS } = require('../config/sampleObservations');

const zoneKeyPairs = [
  ['right_upper', 'RUL'],
  ['right_middle', 'RML'],
  ['right_lower', 'RLL'],
  ['left_upper', 'LUL'],
  ['left_middle', 'LML'],
  ['left_lower', 'LLL']
];

async function syncSampleZones() {
  const mongoURI = process.env.MONGODB_URI || process.env.ATLAS_MONGODB_URI || 'mongodb://127.0.0.1:27017/pneumonia_detection_db';
  console.log('[Sync Sample Zones] Connecting to MongoDB...');
  await mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('[Sync Sample Zones] Connected.');

  const detections = await ChestXrayDetection.find({}).populate('scanId');
  console.log(`[Sync Sample Zones] Found ${detections.length} detections.`);

  let updatedCount = 0;

  for (const doc of detections) {
    const scanFilename = (doc.scanId?.filename || doc.originalImage || '').toLowerCase();
    let matchedBenchmark = null;

    if (scanFilename.includes('person53_virus_107') || doc.sampleBenchmark?.sampleId === 'person53_virus_107') {
      matchedBenchmark = SAMPLE_BENCHMARKS['person53_virus_107'];
    } else if (scanFilename.includes('person67_bacteria_333') || doc.sampleBenchmark?.sampleId === 'person67_bacteria_333') {
      matchedBenchmark = SAMPLE_BENCHMARKS['person67_bacteria_333'];
    }

    if (matchedBenchmark) {
      console.log(`Updating detection ${doc._id} for sample ${matchedBenchmark.id}`);
      if (!doc.manualDetection) doc.manualDetection = {};
      if (!doc.manualDetection.zones) doc.manualDetection.zones = {};

      zoneKeyPairs.forEach(([cKey, sKey]) => {
        const obsText = matchedBenchmark.observations[cKey];
        const status = matchedBenchmark.zoneStatuses[cKey];
        [cKey, sKey].forEach(k => {
          if (!doc.manualDetection.zones[k]) {
            doc.manualDetection.zones[k] = { id: cKey };
          }
          doc.manualDetection.zones[k].status = status;
          doc.manualDetection.zones[k].observation = obsText;
          doc.manualDetection.zones[k].observationProvenance = matchedBenchmark.provenance;
        });
      });

      doc.manualDetection.sampleObservationSummary = matchedBenchmark.summary;
      doc.manualDetection.sampleObservationProvenance = matchedBenchmark.provenance;
      doc.sampleBenchmark = {
        isSample: true,
        sampleId: matchedBenchmark.id,
        canonicalFilename: matchedBenchmark.canonicalFilename,
        provenance: matchedBenchmark.provenance,
        summary: matchedBenchmark.summary
      };

      await ChestXrayDetection.updateOne(
        { _id: doc._id },
        {
          $set: {
            manualDetection: doc.manualDetection,
            sampleBenchmark: doc.sampleBenchmark
          }
        }
      );
      updatedCount++;
    }
  }

  console.log(`[Sync Sample Zones] Updated ${updatedCount} detections with sample observations and zone statuses.`);
  await mongoose.disconnect();
}

syncSampleZones().then(() => {
  console.log('[Sync Sample Zones] Done.');
  process.exit(0);
}).catch(err => {
  console.error('[Sync Sample Zones] Error:', err);
  process.exit(1);
});
