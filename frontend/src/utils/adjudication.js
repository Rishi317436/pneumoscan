/**
 * Determines whether the DIP engine failed and the diagnosis was adjudicated by the ML model.
 * Handles both new scans (with explicit `adjudicated: true` flag) and historical database records.
 */
export const isDIPAdjudicated = (manualDetection, mlDetection, comparison) => {
  const manual = manualDetection || {};
  const ml = mlDetection || {};
  const comp = comparison || {};

  // 1. Explicit flag checks
  if (manual.adjudicated === true || comp.adjudicated === true) return true;
  if (manual.rawPrediction && manual.rawPrediction !== ml.prediction) return true;
  if (manual.adjudicationNote || comp.adjudicationReason) return true;

  // 2. Heuristic safety net:
  // If ML detected Pneumonia, but manual DIP found 0 abnormal zones and had a low score (< 35%),
  // manual DIP clearly failed to detect the lesion and was adjudicated by ML.
  if (
    ml.prediction === 'PNEUMONIA' &&
    (manual.abnormal_zone_count === 0 || manual.normal_zone_count === 6) &&
    typeof manual.score === 'number' &&
    manual.score < 35
  ) {
    return true;
  }

  return false;
};
