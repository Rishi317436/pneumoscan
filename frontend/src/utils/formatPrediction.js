/**
 * Clinical Communication Standards for PneumoScan
 * 
 * In clinical radiology workflows, focal lung opacities and infiltrates can have
 * multifactorial etiologies (e.g. bacterial/viral pneumonia, atelectasis, aspiration, edema).
 * Therefore, automated positive predictions are standardized as:
 * "Pneumonia Suspected — Further Clinical Evaluation Required"
 * and non-pathological findings as "Normal".
 */

export const CLINICAL_LABELS = {
  PNEUMONIA_FULL: 'Pneumonia Suspected — Further Clinical Evaluation Required',
  PNEUMONIA_SHORT: 'Pneumonia Suspected',
  NORMAL: 'Normal'
};

export const formatPredictionLabel = (prediction, options = {}) => {
  if (!prediction) return 'N/A';
  const str = String(prediction).trim();
  const upper = str.toUpperCase();

  if (upper === 'PNEUMONIA' || upper.includes('PNEUMONIA')) {
    if (options.short) return CLINICAL_LABELS.PNEUMONIA_SHORT;
    return CLINICAL_LABELS.PNEUMONIA_FULL;
  }

  if (upper === 'NORMAL') {
    return CLINICAL_LABELS.NORMAL;
  }

  return str;
};
