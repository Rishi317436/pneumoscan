"""
Superpixel Feature Extraction Module for Chest Radiograph Anatomical Regions.

Extracts regional texture characteristics using Simple Linear Iterative Clustering (SLIC):
1. Number of valid superpixels
2. Inter-superpixel intensity variance (macro-texture heterogeneity)
3. Intra-superpixel variance (micro-texture smoothness)
4. Inter-superpixel boundary contrast / gradient
5. Superpixel mean intensity entropy
"""

import numpy as np
from skimage.segmentation import slic
import scipy.ndimage as ndi
from typing import Dict, Any, List


def extract_superpixel_features(cropped_gray: np.ndarray, cropped_mask: np.ndarray) -> Dict[str, float]:
    """
    Computes SLIC superpixel-based texture metrics on a masked anatomical region.
    """
    default_res = {
        "superpixel_count": 0.0,
        "superpixel_inter_variance": 0.0,
        "superpixel_intra_variance": 0.0,
        "superpixel_contrast": 0.0,
        "superpixel_entropy": 0.0,
    }

    if cropped_gray.size == 0 or cropped_mask.size == 0 or np.sum(cropped_mask > 0) < 32:
        return default_res

    h, w = cropped_gray.shape
    valid_mask = (cropped_mask > 0)
    valid_pixels_count = int(np.sum(valid_mask))

    # Scale number of segments adaptively with region size
    n_segments = max(4, min(valid_pixels_count // 50, 40))

    try:
        # Convert grayscale to 3-channel for SLIC
        img_3c = np.stack([cropped_gray, cropped_gray, cropped_gray], axis=-1)
        
        segments = slic(
            img_3c,
            n_segments=n_segments,
            compactness=10.0,
            sigma=1.0,
            start_label=1,
            channel_axis=-1
        )

        # Retain only segments that overlap with valid mask
        valid_labels = np.unique(segments[valid_mask])
        if len(valid_labels) == 0:
            return default_res

        superpixel_means = []
        superpixel_vars = []

        for lbl in valid_labels:
            seg_mask = (segments == lbl) & valid_mask
            if np.sum(seg_mask) < 4:
                continue
            pix = cropped_gray[seg_mask].astype(np.float64)
            superpixel_means.append(float(np.mean(pix)))
            superpixel_vars.append(float(np.var(pix)))

        if len(superpixel_means) == 0:
            return default_res

        sp_means_arr = np.array(superpixel_means)
        sp_vars_arr = np.array(superpixel_vars)

        count = float(len(sp_means_arr))
        inter_var = float(np.var(sp_means_arr))
        intra_var = float(np.mean(sp_vars_arr))

        # Inter-superpixel contrast: average absolute difference between sorted adjacent superpixel means
        if len(sp_means_arr) > 1:
            sorted_means = np.sort(sp_means_arr)
            contrast = float(np.mean(np.diff(sorted_means)))
        else:
            contrast = 0.0

        # Shannon entropy of superpixel mean distribution
        hist, _ = np.histogram(sp_means_arr, bins=16, range=(0, 256), density=True)
        hist = hist[hist > 0]
        entropy_val = float(-np.sum(hist * np.log2(hist))) if len(hist) > 0 else 0.0

        return {
            "superpixel_count": count,
            "superpixel_inter_variance": inter_var,
            "superpixel_intra_variance": intra_var,
            "superpixel_contrast": contrast,
            "superpixel_entropy": entropy_val,
        }

    except Exception:
        return default_res
