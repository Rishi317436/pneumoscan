"""
Local Binary Pattern (LBP) Texture Analysis Module.
Extracts rotation-invariant uniform LBP texture metrics: LBP Mean and LBP Variance.
"""

import numpy as np
from skimage.feature import local_binary_pattern
from typing import Dict, Any

def analyze_zone_lbp(
    cropped_gray: np.ndarray,
    cropped_mask: np.ndarray,
    points: int = 8,
    radius: int = 1
) -> Dict[str, float]:
    """
    Computes uniform LBP representation and extracts first- and second-order statistical moments.
    """
    valid_mask = (cropped_mask > 0)
    valid_pixels = cropped_gray[valid_mask]

    if len(valid_pixels) < 10:
        return {
            "lbp_mean": 0.0,
            "lbp_variance": 0.0
        }

    # Uniform LBP is rotation-invariant and captures micro-textural consolidation
    lbp = local_binary_pattern(
        cropped_gray,
        P=points,
        R=radius,
        method="uniform"
    )

    valid_lbp = lbp[valid_mask]
    lbp_mean = float(np.mean(valid_lbp))
    lbp_var = float(np.var(valid_lbp))

    return {
        "lbp_mean": round(lbp_mean, 3),
        "lbp_variance": round(lbp_var, 3)
    }
