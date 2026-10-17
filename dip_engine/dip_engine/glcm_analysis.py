"""
Gray-Level Co-occurrence Matrix (GLCM) Analysis Module.
Computes multi-distance, multi-angle directional Haralick texture features with gray-level quantization:
- Contrast, Dissimilarity, Homogeneity, Energy, Correlation
"""

import numpy as np
from skimage.feature import graycomatrix, graycoprops
from typing import Dict, Any, List

def analyze_zone_glcm(
    cropped_gray: np.ndarray,
    cropped_mask: np.ndarray,
    levels: int = 32,
    distances: List[int] = [1, 2],
    angles: List[float] = [0.0, 0.785398, 1.570796, 2.356194]
) -> Dict[str, float]:
    """
    Computes quantized multi-directional GLCM matrix and averages properties across all angles.
    """
    valid_mask = (cropped_mask > 0)
    valid_pixels = cropped_gray[valid_mask]

    if len(valid_pixels) < 16:
        return {
            "glcm_contrast": 0.0,
            "glcm_dissimilarity": 0.0,
            "glcm_homogeneity": 0.0,
            "glcm_energy": 0.0,
            "glcm_correlation": 0.0
        }

    # Quantize grayscale image to `levels` (e.g. 32 or 64) for robust co-occurrence statistics
    quantized = np.clip(
        (cropped_gray / (256.0 / levels)).astype(np.uint8),
        0,
        levels - 1
    )

    # Compute GLCM across specified distances and angles
    glcm = graycomatrix(
        quantized,
        distances=distances,
        angles=angles,
        levels=levels,
        symmetric=True,
        normed=True
    )

    contrast = float(np.mean(graycoprops(glcm, "contrast")))
    dissimilarity = float(np.mean(graycoprops(glcm, "dissimilarity")))
    homogeneity = float(np.mean(graycoprops(glcm, "homogeneity")))
    energy = float(np.mean(graycoprops(glcm, "energy")))
    correlation = float(np.mean(graycoprops(glcm, "correlation")))

    return {
        "glcm_contrast": round(contrast, 4),
        "glcm_dissimilarity": round(dissimilarity, 4),
        "glcm_homogeneity": round(homogeneity, 4),
        "glcm_energy": round(energy, 4),
        "glcm_correlation": round(correlation, 4)
    }
