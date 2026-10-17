"""
Bilateral Asymmetry Analysis Module.
Compares corresponding anatomical tiers across Right and Left hemithoraces:
- Right Upper <-> Left Upper (Symmetric apex baseline)
- Right Middle <-> Left Middle (Calibrated for baseline cardiac base)
- Right Lower <-> Left Lower (Calibrated for baseline cardiac apex)

Computes explainable relative asymmetry indices accounting for normal physiological levocardia.
"""

import numpy as np
from typing import Dict, Any

def compute_normalized_asymmetry(val_r: float, val_l: float, expected_ratio_l_to_r: float = 1.0) -> float:
    """
    Computes anatomical asymmetry relative to expected physiological baseline.
    For upper lungs: expected_ratio = 1.0
    For middle lungs: expected_ratio = 1.12 (left is naturally slightly denser due to aortic/cardiac base)
    For lower lungs: expected_ratio = 1.22 (left is naturally denser due to cardiac apex)
    """
    adjusted_l = val_l / max(expected_ratio_l_to_r, 0.5)
    denom = (abs(val_r) + abs(adjusted_l)) / 2.0 + 1e-5
    return float(abs(val_r - adjusted_l) / denom)

def compute_bilateral_asymmetry_suite(
    raw_zone_features: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Performs full bilateral comparison for all three anatomical lung tiers with physiological cardiac baseline calibration.
    """
    tiers = [
        ("upper", "right_upper", "left_upper", "Upper Lung Fields (0 - 33%)", 1.0),
        ("middle", "right_middle", "left_middle", "Middle Lung Fields (33 - 66%)", 1.12),
        ("lower", "right_lower", "left_lower", "Lower Lung Fields (66 - 100%)", 1.20)
    ]

    tier_comparisons = {}
    zone_asymmetry_indices = {}

    for tier_key, r_id, l_id, tier_desc, exp_ratio in tiers:
        zr = raw_zone_features.get(r_id, {})
        zl = raw_zone_features.get(l_id, {})

        if not zr or not zl:
            continue

        hr = zr["histogram_stats"]
        hl = zl["histogram_stats"]
        tr = zr["texture_stats"]
        tl = zl["texture_stats"]
        er = zr["edge_density"]
        el = zl["edge_density"]

        asym_mean = compute_normalized_asymmetry(hr["mean"], hl["mean"], exp_ratio)
        asym_std = compute_normalized_asymmetry(hr["std_dev"], hl["std_dev"], 1.0)
        asym_edge = compute_normalized_asymmetry(er, el, 1.0)
        asym_entropy = compute_normalized_asymmetry(hr["entropy"], hl["entropy"], 1.0)
        asym_lbp_var = compute_normalized_asymmetry(tr["lbp_variance"], tl["lbp_variance"], 1.0)
        asym_glcm_contrast = compute_normalized_asymmetry(tr["glcm_contrast"], tl["glcm_contrast"], 1.0)
        asym_glcm_homo = compute_normalized_asymmetry(tr["glcm_homogeneity"], tl["glcm_homogeneity"], 1.0)
        asym_high_ratio = compute_normalized_asymmetry(hr["high_intensity_ratio"], hl["high_intensity_ratio"], exp_ratio)

        # Composite tier asymmetry index (weighted combination)
        tier_composite = float(
            (0.35 * asym_mean) +
            (0.20 * asym_high_ratio) +
            (0.15 * asym_edge) +
            (0.15 * asym_lbp_var) +
            (0.15 * asym_glcm_contrast)
        )

        tier_comparisons[tier_key] = {
            "tier_name": tier_desc,
            "right_zone_id": r_id,
            "left_zone_id": l_id,
            "mean_intensity_asymmetry": round(asym_mean, 4),
            "std_dev_asymmetry": round(asym_std, 4),
            "edge_density_asymmetry": round(asym_edge, 4),
            "entropy_asymmetry": round(asym_entropy, 4),
            "lbp_variance_asymmetry": round(asym_lbp_var, 4),
            "glcm_contrast_asymmetry": round(asym_glcm_contrast, 4),
            "glcm_homogeneity_asymmetry": round(asym_glcm_homo, 4),
            "high_intensity_asymmetry": round(asym_high_ratio, 4),
            "overall_asymmetry_index": round(tier_composite, 4)
        }

        # Assign tier asymmetry index to both participating zones
        zone_asymmetry_indices[r_id] = round(tier_composite, 4)
        zone_asymmetry_indices[l_id] = round(tier_composite, 4)

    return {
        "tier_comparisons": tier_comparisons,
        "zone_asymmetry_indices": zone_asymmetry_indices
    }
