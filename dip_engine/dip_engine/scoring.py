"""
Transparent Rule-Based DIP Scoring and Classification Module.
Calculates:
- Individual zone scores from normalized DIP features
- Explicit component contribution breakdown
- Six-zone cross-comparisons
- Aggregate DIP activity score and rule-based classification
- Feature agreement index and medical safety disclaimers
"""

import numpy as np
from typing import Dict, Any, List
from config import (
    BRIGHTNESS_WEIGHT,
    EDGE_WEIGHT,
    TEXTURE_WEIGHT,
    CONTRAST_WEIGHT,
    ENTROPY_WEIGHT,
    CLASSIFICATION_THRESHOLD,
    FEATURE_BOUNDS,
    MEDICAL_DISCLAIMER
)
from dip_engine.utils import normalize_feature

def compute_zone_scores(zone_features: Dict[str, Any]) -> Dict[str, Any]:
    """
    Computes explainable normalized DIP feature scores for each lung zone.
    """
    scored_zones: Dict[str, Any] = {}

    for zone_key, z_data in zone_features.items():
        # Raw extracted values
        raw_brightness = z_data["opacity"]["brightness_ratio"]
        raw_edge = z_data["edges"]["edge_density"]
        raw_lbp_var = z_data["texture"]["lbp_variance"]
        raw_glcm_contrast = z_data["texture"]["glcm_contrast"]
        raw_entropy = z_data["intensity"]["entropy"]

        # Normalize each feature to [0.0, 1.0] using defined empirical bounds
        norm_brightness = normalize_feature(raw_brightness, *FEATURE_BOUNDS["brightness_ratio"])
        norm_edge = normalize_feature(raw_edge, *FEATURE_BOUNDS["edge_density"])
        norm_texture = normalize_feature(raw_lbp_var, *FEATURE_BOUNDS["lbp_variance"])
        norm_contrast = normalize_feature(raw_glcm_contrast, *FEATURE_BOUNDS["glcm_contrast"])
        norm_entropy = normalize_feature(raw_entropy, *FEATURE_BOUNDS["entropy"])

        # Calculate individual weighted contributions
        c_brightness = norm_brightness * BRIGHTNESS_WEIGHT
        c_edge = norm_edge * EDGE_WEIGHT
        c_texture = norm_texture * TEXTURE_WEIGHT
        c_contrast = norm_contrast * CONTRAST_WEIGHT
        c_entropy = norm_entropy * ENTROPY_WEIGHT

        # Composite Zone Score on a 0-100 scale
        total_normalized = c_brightness + c_edge + c_texture + c_contrast + c_entropy
        zone_score_100 = round(float(total_normalized * 100), 1)

        # Categorize activity level
        if zone_score_100 >= 55.0:
            activity_level = "High Activity"
            activity_color = "#EF4444" # Red
        elif zone_score_100 >= 38.0:
            activity_level = "Moderate Activity"
            activity_color = "#F59E0B" # Amber
        else:
            activity_level = "Baseline Activity"
            activity_color = "#10B981" # Green

        scored_zones[zone_key] = {
            **z_data,
            "score": zone_score_100,
            "activity_level": activity_level,
            "activity_color": activity_color,
            "normalized_features": {
                "brightness": round(norm_brightness, 4),
                "edge": round(norm_edge, 4),
                "texture": round(norm_texture, 4),
                "contrast": round(norm_contrast, 4),
                "entropy": round(norm_entropy, 4),
            },
            "contributions": {
                "brightness_pts": round(c_brightness * 100, 2),
                "edge_pts": round(c_edge * 100, 2),
                "texture_pts": round(c_texture * 100, 2),
                "contrast_pts": round(c_contrast * 100, 2),
                "entropy_pts": round(c_entropy * 100, 2),
            }
        }

    return scored_zones

def compute_overall_dip_analysis(scored_zones: Dict[str, Any]) -> Dict[str, Any]:
    """
    Synthesizes the 6 zone assessments into an overall DIP score, classification, and summary.
    """
    zone_list = list(scored_zones.values())
    if not zone_list:
        return {}

    scores = [z["score"] for z in zone_list]
    brightness_ratios = [z["opacity"]["brightness_ratio"] for z in zone_list]
    edge_densities = [z["edges"]["edge_density"] for z in zone_list]
    texture_variances = [z["texture"]["lbp_variance"] for z in zone_list]
    glcm_contrasts = [z["texture"]["glcm_contrast"] for z in zone_list]
    entropies = [z["intensity"]["entropy"] for z in zone_list]

    overall_score = round(float(np.mean(scores)), 1)
    
    # Identify highest and lowest activity zones
    highest_zone = max(zone_list, key=lambda z: z["score"])
    lowest_zone = min(zone_list, key=lambda z: z["score"])

    # Feature Agreement Index:
    # Measures the coherence/concordance of elevated features across suspicious zones
    # High agreement means multiple DIP metrics (opacity, edge, texture) consistently agree
    top_normalized = [
        highest_zone["normalized_features"]["brightness"],
        highest_zone["normalized_features"]["edge"],
        highest_zone["normalized_features"]["texture"],
        highest_zone["normalized_features"]["contrast"],
        highest_zone["normalized_features"]["entropy"]
    ]
    agreement_pct = round(float(np.mean(top_normalized) * 100), 1)

    # Deterministic Rule-Based Classification
    if overall_score >= CLASSIFICATION_THRESHOLD or highest_zone["score"] >= (CLASSIFICATION_THRESHOLD + 15.0):
        classification = "PNEUMONIA-SUSPICIOUS PATTERN"
        classification_short = "Pneumonia-Suspicious"
        classification_severity = "warning"
        summary_description = (
            f"Image exhibits elevated radiopacity and localized textural irregularity "
            f"predominantly in the {highest_zone['name']} (Score: {highest_zone['score']}/100)."
        )
    else:
        classification = "NORMAL-LIKE PATTERN"
        classification_short = "Normal-Like"
        classification_severity = "normal"
        summary_description = (
            "Bilateral lung fields demonstrate homogeneous radiolucency with baseline "
            "parenchymal edge density and uniform texture statistics."
        )

    scoring_formula = {
        "formula": "Score = (0.30 * Brightness) + (0.20 * Edge) + (0.20 * Texture) + (0.15 * Contrast) + (0.15 * Entropy)",
        "weights": {
            "brightness_weight": BRIGHTNESS_WEIGHT,
            "edge_weight": EDGE_WEIGHT,
            "texture_weight": TEXTURE_WEIGHT,
            "contrast_weight": CONTRAST_WEIGHT,
            "entropy_weight": ENTROPY_WEIGHT,
        },
        "threshold": CLASSIFICATION_THRESHOLD
    }

    feature_summary = {
        "average_score": overall_score,
        "highest_zone": {
            "id": highest_zone["id"],
            "name": highest_zone["name"],
            "score": highest_zone["score"]
        },
        "lowest_zone": {
            "id": lowest_zone["id"],
            "name": lowest_zone["name"],
            "score": lowest_zone["score"]
        },
        "averages": {
            "brightness_ratio": round(float(np.mean(brightness_ratios)), 4),
            "edge_density": round(float(np.mean(edge_densities)), 4),
            "texture_variance": round(float(np.mean(texture_variances)), 3),
            "glcm_contrast": round(float(np.mean(glcm_contrasts)), 3),
            "entropy": round(float(np.mean(entropies)), 3)
        },
        "feature_agreement_pct": agreement_pct
    }

    return {
        "overall_score": overall_score,
        "classification": classification,
        "classification_short": classification_short,
        "classification_severity": classification_severity,
        "feature_agreement_pct": agreement_pct,
        "summary_description": summary_description,
        "scoring_formula": scoring_formula,
        "feature_summary": feature_summary,
        "medical_disclaimer": MEDICAL_DISCLAIMER
    }
