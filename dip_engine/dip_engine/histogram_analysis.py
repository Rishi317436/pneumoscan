"""
Histogram & Intensity Statistical Analysis Module.
Calculates 11 statistical moments & intensity ratios for valid lung pixels within a zone:
- Mean, Median, Std Dev, Variance, Min, Max, Dynamic Range
- Shannon Intensity Entropy: H = - sum(p(i) * log2(p(i)))
- Skewness: mean((x - mu)^3) / sigma^3
- Kurtosis: mean((x - mu)^4) / sigma^4 - 3
- Uniformity: sum(p(i)^2)
- High-Intensity / Opacity Ratio and Low-Intensity Ratio
"""

import numpy as np
from typing import Dict, Any

def compute_zone_histogram_moments(pixels: np.ndarray) -> Dict[str, Any]:
    """
    Computes comprehensive statistical moments on valid zone pixels.
    """
    if len(pixels) == 0:
        return {
            "mean": 0.0,
            "median": 0.0,
            "std_dev": 0.0,
            "variance": 0.0,
            "min_intensity": 0.0,
            "max_intensity": 0.0,
            "dynamic_range": 0.0,
            "entropy": 0.0,
            "skewness": 0.0,
            "kurtosis": 0.0,
            "uniformity": 0.0,
            "high_intensity_ratio": 0.0,
            "low_intensity_ratio": 0.0,
            "local_contrast": 0.0
        }

    p_float = pixels.astype(np.float64)
    n = len(p_float)

    mu = float(np.mean(p_float))
    med = float(np.median(p_float))
    sigma = float(np.std(p_float))
    var = float(np.var(p_float))
    p_min = float(np.min(p_float))
    p_max = float(np.max(p_float))
    dyn_range = float(p_max - p_min)

    # Shannon Entropy & Uniformity from normalized histogram
    hist, _ = np.histogram(pixels, bins=256, range=(0, 256), density=True)
    non_zero = hist[hist > 0]
    entropy_val = float(-np.sum(non_zero * np.log2(non_zero))) if len(non_zero) > 0 else 0.0
    uniformity_val = float(np.sum(hist ** 2))

    # Skewness: 3rd standardized moment
    # Positive skewness indicates longer tail of high-intensity opacities
    if sigma > 1e-4:
        skewness_val = float(np.mean(((p_float - mu) / sigma) ** 3))
        kurtosis_val = float(np.mean(((p_float - mu) / sigma) ** 4) - 3.0)
    else:
        skewness_val = 0.0
        kurtosis_val = 0.0

    # Dynamic Opacity & Radiolucency Ratios
    # Opacities are pixels significantly higher than zone baseline
    t_high = mu + (0.8 * sigma)
    t_low = max(0.0, mu - (0.8 * sigma))

    high_ratio = float(np.sum(p_float > t_high) / n)
    low_ratio = float(np.sum(p_float < t_low) / n)

    # Michelson Local Contrast
    local_contrast = float((p_max - p_min) / (p_max + p_min + 1e-5))

    return {
        "mean": round(mu, 2),
        "median": round(med, 2),
        "std_dev": round(sigma, 2),
        "variance": round(var, 2),
        "min_intensity": round(p_min, 2),
        "max_intensity": round(p_max, 2),
        "dynamic_range": round(dyn_range, 2),
        "entropy": round(entropy_val, 4),
        "skewness": round(skewness_val, 4),
        "kurtosis": round(kurtosis_val, 4),
        "uniformity": round(uniformity_val, 5),
        "high_intensity_ratio": round(high_ratio, 4),
        "low_intensity_ratio": round(low_ratio, 4),
        "local_contrast": round(local_contrast, 4)
    }
