/**
 * Centralized configuration for illustrative sample chest radiographs.
 * Associates stable identifiers with predefined preliminary visual observations.
 *
 * NOTE: These are preliminary visual observations, not verified diagnoses
 * or model-generated results.
 */
export const SAMPLE_BENCHMARKS = {
  'person53_virus_107': {
    id: 'person53_virus_107',
    canonicalFilename: 'person53_virus_107.jpeg',
    title: 'Sample 1: Pneumonia Radiograph (person53_virus_107)',
    badge: 'Pneumonia Benchmark',
    badgeClass: 'rad-badge-pneumonia',
    provenance: 'Preliminary visual inspection (illustrative benchmark observation)',
    url: '/sample_scans/person53_virus_107.jpeg',
    description: 'Preliminary visual inspection: Relative lower/perihilar haziness with overlapping structures.',
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
    badge: 'Pneumonia Benchmark',
    badgeClass: 'rad-badge-pneumonia',
    provenance: 'Preliminary visual inspection (illustrative benchmark observation)',
    url: '/sample_scans/person67_bacteria_333.jpeg',
    description: 'Preliminary visual inspection: Diffuse haziness across middle and lower pulmonary zones.',
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
 * Normal control samples in the modal
 */
export const NORMAL_CONTROL_SAMPLES = [
  {
    type: 'NORMAL',
    badge: 'Normal Control',
    badgeClass: 'rad-badge-normal',
    title: 'Sample 3: Normal Chest Radiograph',
    filename: 'sample_normal_1.jpeg',
    url: '/sample_scans/sample_normal_1.jpeg',
    description: 'Clear lung fields with symmetric radiolucency and normal cardiac contour.'
  },
  {
    type: 'NORMAL',
    badge: 'Normal Control',
    badgeClass: 'rad-badge-normal',
    title: 'Sample 4: Normal Chest Radiograph',
    filename: 'sample_normal_2.jpeg',
    url: '/sample_scans/sample_normal_2.jpeg',
    description: 'Unremarkable pulmonary parenchyma, normal bronchovascular distribution.'
  }
];

/**
 * Matches a filename or sample ID to a sample benchmark configuration.
 */
export function getSampleBenchmark(identifier) {
  if (!identifier) return null;
  const str = String(identifier).trim().toLowerCase();

  for (const key of Object.keys(SAMPLE_BENCHMARKS)) {
    const s = SAMPLE_BENCHMARKS[key];
    if (
      str === s.id.toLowerCase() ||
      str === s.canonicalFilename.toLowerCase() ||
      str.endsWith('/' + s.canonicalFilename.toLowerCase()) ||
      str.endsWith('\\' + s.canonicalFilename.toLowerCase())
    ) {
      return s;
    }
  }
  return null;
}
