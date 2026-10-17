"""
Unified 7-Region Feature Extraction Engine for PneumoScan.

Extracts:
1. Radiomics First-Order Intensity Moments (13 features)
2. Haralick GLCM Texture Features (6 features)
3. 2D Differential Box-Counting Fractal Dimension (1 feature)
4. SLIC Superpixel Regional Texture Metrics (5 features)
Total = 25 features per region x 7 anatomical regions = 175-dimensional feature vector.

Regions:
- Right Upper Zone
- Right Middle Zone
- Right Lower Zone
- Left Upper Zone
- Left Middle Zone
- Left Lower Zone
- Retrocardiac Region
"""

import numpy as np
from typing import Dict, Any, List, Tuple
from ml.radiomics_features import extract_radiomics_features
from ml.fractal_features import extract_fractal_features
from ml.superpixel_features import extract_superpixel_features

REGION_KEYS = [
    "right_upper",
    "right_middle",
    "right_lower",
    "left_upper",
    "left_middle",
    "left_lower",
    "retrocardiac"
]


def extract_single_region_features(cropped_gray: np.ndarray, cropped_mask: np.ndarray) -> Dict[str, float]:
    """
    Extracts radiomics, fractal, and superpixel features for a single anatomical region crop.
    """
    feats: Dict[str, float] = {}

    # 1. Radiomics (first order + GLCM)
    radiomics = extract_radiomics_features(cropped_gray, cropped_mask)
    feats.update(radiomics)

    # 2. Fractal Dimension
    fractal = extract_fractal_features(cropped_gray, cropped_mask)
    feats.update(fractal)

    # 3. Superpixel Texture
    superpixel = extract_superpixel_features(cropped_gray, cropped_mask)
    feats.update(superpixel)

    return feats


def extract_seven_region_features(zones_dict: Dict[str, Any]) -> Tuple[Dict[str, Dict[str, float]], np.ndarray, List[str]]:
    """
    Extracts features across all 7 anatomical regions and concatenates into a deterministic feature vector.

    Returns:
        regional_features_dict: Dict mapping region_name -> dict of feature values
        feature_vector: 1D numpy array of shape (N_features,)
        feature_names: List of strings corresponding to each dimension in feature_vector
    """
    regional_features: Dict[str, Dict[str, float]] = {}
    ordered_values: List[float] = []
    feature_names: List[str] = []

    for r_key in REGION_KEYS:
        if r_key in zones_dict:
            z_data = zones_dict[r_key]
            c_gray = z_data.get("cropped_gray", np.array([]))
            c_mask = z_data.get("cropped_mask", np.array([]))
            r_feats = extract_single_region_features(c_gray, c_mask)
        else:
            # Fallback zero-filled features if a region was completely obscured
            dummy_gray = np.zeros((10, 10), dtype=np.uint8)
            dummy_mask = np.zeros((10, 10), dtype=np.uint8)
            r_feats = extract_single_region_features(dummy_gray, dummy_mask)

        regional_features[r_key] = r_feats

        # Append in deterministic alphabetical key order per region
        for f_name in sorted(r_feats.keys()):
            val = float(r_feats[f_name])
            if np.isnan(val) or np.isinf(val):
                val = 0.0
            ordered_values.append(val)
            feature_names.append(f"{r_key}__{f_name}")

    feature_vector = np.array(ordered_values, dtype=np.float32)
    return regional_features, feature_vector, feature_names
