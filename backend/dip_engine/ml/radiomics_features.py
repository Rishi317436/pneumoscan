"""
Radiomics Feature Extraction Module for Chest Radiograph Anatomical Regions.

Extracts:
1. First-Order Intensity Moments:
   - Mean, Median, Min, Max, Range, Standard Deviation, Variance,
   - Skewness, Kurtosis, Energy, Shannon Entropy, 10th Percentile, 90th Percentile.
2. Haralick Gray-Level Co-occurrence Matrix (GLCM) Texture Features:
   - Contrast, Dissimilarity, Homogeneity, Energy, Correlation, Angular Second Moment (ASM).
"""

import numpy as np
import scipy.stats as stats
from skimage.feature import graycomatrix, graycoprops
from typing import Dict, Any, List


def compute_first_order_features(pixels: np.ndarray) -> Dict[str, float]:
    """
    Computes first-order statistical intensity moments on a 1D array of valid region pixels.
    """
    if len(pixels) == 0:
        return {
            "mean": 0.0,
            "median": 0.0,
            "min": 0.0,
            "max": 0.0,
            "range": 0.0,
            "std": 0.0,
            "variance": 0.0,
            "skewness": 0.0,
            "kurtosis": 0.0,
            "energy": 0.0,
            "entropy": 0.0,
            "p10": 0.0,
            "p90": 0.0,
        }

    pixels_float = pixels.astype(np.float64)
    mean_val = float(np.mean(pixels_float))
    median_val = float(np.median(pixels_float))
    min_val = float(np.min(pixels_float))
    max_val = float(np.max(pixels_float))
    range_val = float(max_val - min_val)
    std_val = float(np.std(pixels_float))
    var_val = float(np.var(pixels_float))

    # Higher-order moments
    skew_val = float(stats.skew(pixels_float)) if std_val > 1e-6 else 0.0
    kurt_val = float(stats.kurtosis(pixels_float)) if std_val > 1e-6 else 0.0
    
    # Energy: sum of squared normalized intensities
    norm_pixels = pixels_float / 255.0
    energy_val = float(np.sum(norm_pixels ** 2) / max(len(norm_pixels), 1))

    # Shannon Entropy of pixel intensity histogram
    hist, _ = np.histogram(pixels, bins=32, range=(0, 256), density=True)
    hist = hist[hist > 0]
    entropy_val = float(-np.sum(hist * np.log2(hist))) if len(hist) > 0 else 0.0

    p10_val = float(np.percentile(pixels_float, 10))
    p90_val = float(np.percentile(pixels_float, 90))

    return {
        "mean": mean_val,
        "median": median_val,
        "min": min_val,
        "max": max_val,
        "range": range_val,
        "std": std_val,
        "variance": var_val,
        "skewness": skew_val,
        "kurtosis": kurt_val,
        "energy": energy_val,
        "entropy": entropy_val,
        "p10": p10_val,
        "p90": p90_val,
    }


def compute_glcm_features(cropped_gray: np.ndarray, cropped_mask: np.ndarray) -> Dict[str, float]:
    """
    Computes Haralick GLCM texture features on the masked region crop.
    Quantizes intensities to 32 gray levels for computational efficiency and statistical robustness.
    """
    if cropped_gray.size == 0 or cropped_mask.size == 0 or np.sum(cropped_mask > 0) < 16:
        return {
            "glcm_contrast": 0.0,
            "glcm_dissimilarity": 0.0,
            "glcm_homogeneity": 0.0,
            "glcm_energy": 0.0,
            "glcm_correlation": 0.0,
            "glcm_asm": 0.0,
        }

    # Mask unselected pixels with background value 0, quantize valid pixels to [1..31]
    quantized = np.zeros_like(cropped_gray, dtype=np.uint8)
    valid_idx = cropped_mask > 0
    quantized[valid_idx] = np.clip((cropped_gray[valid_idx] / 8.0).astype(np.uint8) + 1, 1, 31)

    distances = [1, 2]
    angles = [0, np.pi / 4, np.pi / 2, 3 * np.pi / 4]

    try:
        glcm = graycomatrix(
            quantized,
            distances=distances,
            angles=angles,
            levels=32,
            symmetric=True,
            normed=True
        )

        # Disregard level 0 (background mask) if present by slicing valid levels
        glcm_valid = glcm[1:, 1:, :, :]
        glcm_sum = np.sum(glcm_valid, axis=(0, 1), keepdims=True)
        glcm_sum[glcm_sum == 0] = 1.0
        glcm_normed = glcm_valid / glcm_sum

        contrast = float(np.mean(graycoprops(glcm_normed, 'contrast')))
        dissimilarity = float(np.mean(graycoprops(glcm_normed, 'dissimilarity')))
        homogeneity = float(np.mean(graycoprops(glcm_normed, 'homogeneity')))
        energy = float(np.mean(graycoprops(glcm_normed, 'energy')))
        correlation = float(np.mean(graycoprops(glcm_normed, 'correlation')))
        asm = float(np.mean(graycoprops(glcm_normed, 'ASM')))

        # Handle any NaN results safely
        contrast = 0.0 if np.isnan(contrast) else contrast
        dissimilarity = 0.0 if np.isnan(dissimilarity) else dissimilarity
        homogeneity = 0.0 if np.isnan(homogeneity) else homogeneity
        energy = 0.0 if np.isnan(energy) else energy
        correlation = 0.0 if np.isnan(correlation) else correlation
        asm = 0.0 if np.isnan(asm) else asm

    except Exception:
        contrast, dissimilarity, homogeneity, energy, correlation, asm = 0.0, 0.0, 0.0, 0.0, 0.0, 0.0

    return {
        "glcm_contrast": contrast,
        "glcm_dissimilarity": dissimilarity,
        "glcm_homogeneity": homogeneity,
        "glcm_energy": energy,
        "glcm_correlation": correlation,
        "glcm_asm": asm,
    }


def extract_radiomics_features(cropped_gray: np.ndarray, cropped_mask: np.ndarray) -> Dict[str, float]:
    """
    Extracts all first-order intensity moments and GLCM texture features for an anatomical region.
    """
    if cropped_mask is not None and np.sum(cropped_mask > 0) > 0:
        pixels = cropped_gray[cropped_mask > 0]
    else:
        pixels = cropped_gray.flatten()

    first_order = compute_first_order_features(pixels)
    glcm_feats = compute_glcm_features(cropped_gray, cropped_mask)

    combined = {}
    combined.update(first_order)
    combined.update(glcm_feats)
    return combined
