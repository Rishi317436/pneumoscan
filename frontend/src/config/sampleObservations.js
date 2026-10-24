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
    title: 'Sample 1: Chest Radiograph',
    badge: 'Study #01',
    badgeClass: 'bg-dark border border-secondary text-secondary',
    provenance: 'Preliminary visual inspection (illustrative benchmark observation)',
    url: '/sample_scans/person53_virus_107.jpeg',
    description: 'Adult PA projection chest radiograph available for blind workflow analysis.',
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
    title: 'Sample 2: Chest Radiograph',
    badge: 'Study #02',
    badgeClass: 'bg-dark border border-secondary text-secondary',
    provenance: 'Preliminary visual inspection (illustrative benchmark observation)',
    url: '/sample_scans/person67_bacteria_333.jpeg',
    description: 'Thoracic PA projection imaging study available for evaluation.',
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
 * Control test samples in the modal
 */
export const NORMAL_CONTROL_SAMPLES = [
  {
    type: 'STUDY',
    badge: 'Study #03',
    badgeClass: 'bg-dark border border-secondary text-secondary',
    title: 'Sample 3: Chest Radiograph',
    filename: 'sample_study_03.jpeg',
    url: '/sample_scans/sample_study_03.jpeg',
    description: 'Standard posteroanterior projection chest study for evaluation.'
  },
  {
    type: 'STUDY',
    badge: 'Study #04',
    badgeClass: 'bg-dark border border-secondary text-secondary',
    title: 'Sample 4: Chest Radiograph',
    filename: 'sample_study_04.jpeg',
    url: '/sample_scans/sample_study_04.jpeg',
    description: 'Digital posteroanterior projection chest study for evaluation.'
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
