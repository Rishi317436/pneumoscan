const crypto = require('crypto');

/**
 * Centralized configuration for illustrative sample chest radiographs.
 * Associates stable identifiers (exact SHA-256 hashes and canonical filenames)
 * with predefined preliminary visual observations.
 *
 * NOTE: These are preliminary visual observations, not verified diagnoses
 * or model-generated results.
 */
const SAMPLE_BENCHMARKS = {
  'person53_virus_107': {
    id: 'person53_virus_107',
    canonicalFilename: 'person53_virus_107.jpeg',
    title: 'Sample 1: Pneumonia Radiograph (person53_virus_107)',
    provenance: 'Preliminary visual inspection (illustrative benchmark observation)',
    sha256Hashes: [
      '4c9ae7854a2bb8d8499f0e4f38f6a7174f3cfc67788c95bafdf6d5a9fef3d208',
      'bc6a03c24e90b580ba040525d895716b3110bc950d6d604431b952e1b3a6db92'
    ],
    summary: 'Preliminary visual inspection indicates relative lower/perihilar haziness with overlapping cardiac and vascular structures limiting lower left assessment.',
    observations: {
      right_upper: 'No obvious dense focal opacity apparent on preliminary visual inspection.',
      right_middle: 'Mild haziness may be present.',
      right_lower: 'Relative haziness around the lower/perihilar region warrants closer review.',
      left_upper: 'No obvious dense focal opacity apparent.',
      left_middle: 'Mild haziness and overlapping structures limit assessment.',
      left_lower: 'Assessment is limited by the heart shadow.'
    }
  },
  'person67_bacteria_333': {
    id: 'person67_bacteria_333',
    canonicalFilename: 'person67_bacteria_333.jpeg',
    title: 'Sample 2: Pneumonia Radiograph (person67_bacteria_333)',
    provenance: 'Preliminary visual inspection (illustrative benchmark observation)',
    sha256Hashes: [
      'e0e940b9c0d75a197b0a86e27709cd7bbd9f93e75ae50dd376c5514e1a140800',
      '2680f0fa2b5f3fc0c9c7624aea952c5d42d354c05e538a77c0292d5395966c19'
    ],
    summary: 'Diffuse haziness is visible across middle and lower pulmonary zones bilaterally with relative preservation of upper lung aeration.',
    observations: {
      right_upper: 'Diffuse haziness is visible, with overlapping structures limiting assessment.',
      right_middle: 'Increased haziness is visible around the central lung region.',
      right_lower: 'Hazy opacities are visible in the lower lung region.',
      left_upper: 'The upper region appears relatively better aerated, although assessment is limited.',
      left_middle: 'Hazy appearance is present around the central region.',
      left_lower: 'Hazy opacities are visible near the lower lung region.'
    }
  }
};

/**
 * Matches an image by exact SHA-256 hash or canonical filename.
 * Guarantees stable identification without substring guessing.
 *
 * @param {Buffer|null} fileBuffer - Binary buffer of the uploaded file
 * @param {string} originalFilename - Original uploaded filename
 * @returns {object|null} - Matching sample configuration or null for regular uploads
 */
function matchSampleBenchmark(fileBuffer, originalFilename) {
  let fileHash = null;
  if (fileBuffer && Buffer.isBuffer(fileBuffer)) {
    fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex').toLowerCase();
  }

  const cleanFilename = String(originalFilename || '').trim().toLowerCase();

  for (const key of Object.keys(SAMPLE_BENCHMARKS)) {
    const sample = SAMPLE_BENCHMARKS[key];

    // 1. Primary check: Exact SHA-256 hash match
    if (fileHash && sample.sha256Hashes.includes(fileHash)) {
      return { ...sample, matchedBy: 'sha256', detectedHash: fileHash };
    }

    // 2. Secondary check: Exact canonical filename match
    if (cleanFilename === sample.canonicalFilename.toLowerCase() || cleanFilename === sample.id.toLowerCase() + '.jpeg' || cleanFilename === sample.id.toLowerCase() + '.jpg') {
      return { ...sample, matchedBy: 'canonical_filename', detectedHash: fileHash };
    }
  }

  return null;
}

module.exports = {
  SAMPLE_BENCHMARKS,
  matchSampleBenchmark
};
