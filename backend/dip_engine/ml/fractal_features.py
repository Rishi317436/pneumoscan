"""
Fractal Dimension Feature Extraction Module for Chest Radiograph Anatomical Regions.

Calculates the 2D Differential Box-Counting (DBC) Fractal Dimension on the
regional gray-level intensity surface:
  D = lim (log N(eps) / log (1/eps)) as eps -> 0
"""

import numpy as np
from typing import Dict, Any, List


def compute_differential_box_counting_fd(cropped_gray: np.ndarray, cropped_mask: np.ndarray) -> float:
    """
    Computes the 2D Differential Box-Counting (DBC) fractal dimension of a masked image region.
    Treats pixel intensities as a 3D topographic surface z = I(x, y).
    """
    if cropped_gray.size == 0 or cropped_mask.size == 0 or np.sum(cropped_mask > 0) < 16:
        return 2.0  # Default baseline topological surface dimension

    h, w = cropped_gray.shape
    min_dim = min(h, w)
    if min_dim < 4:
        return 2.0

    # Normalization factor for intensity boxes
    gray_norm = cropped_gray.astype(np.float64)

    # Box sizes s
    max_box = min(min_dim // 2, 64)
    if max_box < 2:
        return 2.0

    # Candidate box sizes as powers of 2: e.g., [2, 4, 8, 16, 32]
    box_sizes = []
    s = 2
    while s <= max_box:
        box_sizes.append(s)
        s *= 2

    if len(box_sizes) < 2:
        box_sizes = [2, 4]

    log_inv_s = []
    log_N_s = []

    for s in box_sizes:
        num_boxes_y = int(np.ceil(h / s))
        num_boxes_x = int(np.ceil(w / s))
        total_boxes = 0

        # Vertical intensity box height scaling
        intensity_box_height = max(1.0, 256.0 * (s / float(min_dim)))

        for i in range(num_boxes_y):
            y_start = i * s
            y_end = min(y_start + s, h)

            for j in range(num_boxes_x):
                x_start = j * s
                x_end = min(x_start + s, w)

                mask_box = cropped_mask[y_start:y_end, x_start:x_end]
                if np.sum(mask_box > 0) == 0:
                    continue  # Skip background boxes

                gray_box = gray_norm[y_start:y_end, x_start:x_end][mask_box > 0]
                if len(gray_box) == 0:
                    continue

                min_val = np.min(gray_box)
                max_val = np.max(gray_box)

                # Number of vertical boxes covering intensity range
                k_min = int(np.floor(min_val / intensity_box_height))
                k_max = int(np.floor(max_val / intensity_box_height))
                n_r = (k_max - k_min) + 1
                total_boxes += n_r

        if total_boxes > 0:
            log_inv_s.append(np.log(1.0 / (float(s) / float(min_dim))))
            log_N_s.append(np.log(float(total_boxes)))

    if len(log_inv_s) < 2:
        return 2.0

    # Estimate slope via linear regression
    try:
        slope, _ = np.polyfit(log_inv_s, log_N_s, 1)
        # Fractal dimension for surface typically lies in [2.0, 3.0]
        fd = float(np.clip(slope, 1.5, 3.0))
    except Exception:
        fd = 2.0

    return fd


def extract_fractal_features(cropped_gray: np.ndarray, cropped_mask: np.ndarray) -> Dict[str, float]:
    """
    Extracts fractal dimension features for an anatomical region.
    """
    fd = compute_differential_box_counting_fd(cropped_gray, cropped_mask)
    return {
        "fractal_dimension": fd
    }
