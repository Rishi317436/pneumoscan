"""
Zone Abnormality Scoring & Multi-Feature Agreement Module.
Evaluates 5 independent DIP indicator categories per zone:
1. Intensity & Radiopacity Deviation (Relative to Patient Lung Baseline)
2. Bilateral Asymmetry (Relative to Opposite Hemithorax Tier with Cardiac Calibration)
3. Texture & Structural Heterogeneity (LBP Variance & GLCM Contrast)
4. Local Windowed Abnormality Density (Tile Deviation Map)
5. Candidate Abnormal Region Burden (Segmented Morphological Blobs)

Precisely discriminates normal smooth cardiac silhouette from paracardiac & retrocardiac pneumonia.
"""

import numpy as np
from typing import Dict, Any, List, Tuple
from utils.image_utils import safe_normalize

def score_all_zones(
    raw_zone_features: Dict[str, Any],
    bilateral_results: Dict[str, Any],
    global_lung_stats: Dict[str, float],
    weights: Dict[str, float],
    suspicious_threshold: float = 38.0,
    abnormal_threshold: float = 55.0
) -> Dict[str, Any]:
    """
    Computes explainable, multi-parametric evidence scores and status classifications for all 6 zones.
    """
    scored_zones: Dict[str, Any] = {}
    lung_mean = global_lung_stats.get("lung_mean", 90.0)
    lung_std = global_lung_stats.get("lung_std", 35.0) + 1e-4

    zone_asym_map = bilateral_results.get("zone_asymmetry_indices", {})

    # Check overall left lung profile to detect lobar/diffuse consolidation vs isolated normal cardiac shadow
    l_up_mean = raw_zone_features.get("left_upper", {}).get("histogram_stats", {}).get("mean", 100.0)
    has_diffuse_left_consolidation = l_up_mean > 150.0

    for zone_id, z_data in raw_zone_features.items():
        hist = z_data["histogram_stats"]
        text = z_data["texture_stats"]
        edge_dens = z_data["edge_density"]
        heat_mean = z_data["local_heatmap_mean"]
        heat_p90 = z_data["local_heatmap_p90"]
        cand_count = z_data["candidate_count"]
        cand_area_ratio = z_data["abnormal_area_ratio"]
        asym_index = zone_asym_map.get(zone_id, 0.0)

        # Check if zone is in left cardiac region (Left Lower and Left Middle)
        is_left_cardiac = zone_id in ["left_lower", "left_middle"]
        is_upper_apical = zone_id in ["right_upper", "left_upper"]
        
        # Texture & consolidation markers
        lbp_var = text.get("lbp_variance", 0.0)
        glcm_cont = text.get("glcm_contrast", 0.0)
        z_mean_val = hist["mean"]
        # Infiltrative parenchymal consolidation causes elevated micro-texture disorder
        has_textural_disorder = (lbp_var > 3.8) or (glcm_cont > 3.0)

        # In cardiac-adjacent zones:
        has_severe_consolidation = z_mean_val > 165.0
        has_infiltrative_texture = has_textural_disorder and (cand_count > 0) and (cand_area_ratio > 0.05)
        has_paracardiac_infiltrate = has_severe_consolidation or has_diffuse_left_consolidation or has_infiltrative_texture

        # Cardiac shadow attenuation: applied to normal physiological heart range
        if is_left_cardiac and not has_paracardiac_infiltrate:
            # Normal smooth cardiac silhouette in healthy patient (low texture disorder)
            cardiac_intensity_scale = 0.65 if zone_id == "left_lower" else 0.78
            cardiac_asym_scale = 0.45 if zone_id == "left_lower" else 0.65
            cardiac_heat_scale = 0.45
            cardiac_cand_scale = 0.20
        else:
            # True pneumonia consolidation near or over the heart
            cardiac_intensity_scale = 1.0
            cardiac_asym_scale = 1.0
            cardiac_heat_scale = 1.0
            cardiac_cand_scale = 1.0

        # Apical bony clavicle & thoracic inlet calibration:
        # In upper zones, normal clavicles and first ribs cross clear lungs without infiltration
        if is_upper_apical and not has_textural_disorder and not has_severe_consolidation:
            apical_scale = 0.85
            apical_cand_scale = 0.40
        else:
            apical_scale = 1.0
            apical_cand_scale = 1.0

        # ----------------------------------------------------
        # 1. Intensity & Radiopacity Evidence Sub-Score
        # ----------------------------------------------------
        adj_mean = hist["mean"] * cardiac_intensity_scale * apical_scale
        rel_mean_dev = max(0.0, (adj_mean - lung_mean) / (1.5 * lung_std))
        # Absolute radiopacity vs healthy physiological aerated baseline (~105-115)
        abs_opac_dev = safe_normalize(adj_mean, 115.0, 165.0)
        # Global diffuse consolidation boost (when entire lung mean > 120, typical of severe bilateral pneumonia)
        global_opac_boost = safe_normalize(lung_mean, 120.0, 150.0) * 0.25
        high_ratio_norm = safe_normalize(hist["high_intensity_ratio"] * cardiac_intensity_scale * apical_scale, 0.12, 0.38)
        evidence_intensity = float(np.clip((0.35 * rel_mean_dev) + (0.40 * abs_opac_dev) + (0.25 * high_ratio_norm) + global_opac_boost, 0.0, 1.0))

        # ----------------------------------------------------
        # 2. Bilateral Asymmetry Evidence Sub-Score
        # ----------------------------------------------------
        evidence_asymmetry = float(np.clip(safe_normalize(asym_index * cardiac_asym_scale, 0.07, 0.40), 0.0, 1.0))

        # ----------------------------------------------------
        # 3. Texture & Structural Heterogeneity Evidence Sub-Score
        # ----------------------------------------------------
        rel_lbp_var = safe_normalize(lbp_var, 1.8, 5.5)
        rel_glcm_contrast = safe_normalize(glcm_cont, 1.5, 6.5)
        evidence_texture = float(np.clip((0.55 * rel_lbp_var) + (0.45 * rel_glcm_contrast), 0.0, 1.0))

        # ----------------------------------------------------
        # 4. Local Windowed Abnormality Evidence Sub-Score
        # ----------------------------------------------------
        evidence_local = float(np.clip((0.40 * safe_normalize(heat_mean * cardiac_heat_scale, 0.10, 0.50)) + (0.60 * safe_normalize(heat_p90 * cardiac_heat_scale, 0.18, 0.65)), 0.0, 1.0))

        # ----------------------------------------------------
        # 5. Candidate Abnormal Region Burden Sub-Score
        # ----------------------------------------------------
        cand_burden = safe_normalize(cand_area_ratio * cardiac_cand_scale * apical_cand_scale, 0.05, 0.35)
        cand_count_norm = safe_normalize(float(cand_count) * cardiac_cand_scale * apical_cand_scale, 0.0, 3.0)
        evidence_regions = float(np.clip((0.70 * cand_burden) + (0.30 * cand_count_norm), 0.0, 1.0))

        # ----------------------------------------------------
        # Multi-Feature Agreement Consensus
        # ----------------------------------------------------
        supporting_reasons = []
        agreeing_groups = 0

        if evidence_intensity >= 0.40:
            agreeing_groups += 1
            supporting_reasons.append(f"Elevated radiopacity (mean: {hist['mean']} vs baseline: {round(lung_mean, 1)})")

        if evidence_asymmetry >= 0.38:
            agreeing_groups += 1
            supporting_reasons.append(f"Bilateral asymmetry against opposite hemithorax ({round(asym_index * 100, 1)}%)")

        if evidence_texture >= 0.40:
            agreeing_groups += 1
            supporting_reasons.append(f"Textural disorder (LBP variance: {lbp_var}, GLCM contrast: {glcm_cont})")

        if evidence_local >= 0.40:
            agreeing_groups += 1
            supporting_reasons.append("Localized heterogeneous windowed deviation detected")

        if evidence_regions >= 0.38:
            agreeing_groups += 1
            if is_left_cardiac and has_paracardiac_infiltrate:
                supporting_reasons.append(f"Paracardiac consolidation: {cand_count} region(s) covering {round(cand_area_ratio * 100, 1)}% of zone")
            else:
                supporting_reasons.append(f"{cand_count} candidate opacity region(s) covering {round(cand_area_ratio * 100, 1)}% of zone")

        agreement_ratio_str = f"{agreeing_groups}/5"
        agreement_pct = round(float(agreeing_groups / 5.0) * 100, 1)

        # ----------------------------------------------------
        # Composite Zone Score (0 - 100)
        # ----------------------------------------------------
        w_int = weights.get("weight_intensity", 0.25)
        w_asym = weights.get("weight_asymmetry", 0.25)
        w_tex = weights.get("weight_texture", 0.20)
        w_loc = weights.get("weight_local_contrast", 0.15)
        w_reg = weights.get("weight_candidate_regions", 0.15)

        total_weighted = (
            (w_int * evidence_intensity) +
            (w_asym * evidence_asymmetry) +
            (w_tex * evidence_texture) +
            (w_loc * evidence_local) +
            (w_reg * evidence_regions)
        )
        zone_score = round(float(total_weighted * 100.0), 1)

        # ----------------------------------------------------
        # Zone Classification Rule (Strict Threshold Synchronization)
        # ----------------------------------------------------
        if zone_score >= abnormal_threshold:
            status = "ABNORMAL"
            status_color = "#EF4444" # Red
        elif zone_score >= suspicious_threshold:
            status = "SUSPICIOUS"
            status_color = "#F59E0B" # Amber
        elif agreeing_groups >= 3 and zone_score >= 38.0:
            status = "SUSPICIOUS"
            status_color = "#F59E0B" # Amber
        else:
            status = "NORMAL"
            status_color = "#10B981" # Green

        scored_zones[zone_id] = {
            **z_data,
            "score": zone_score,
            "status": status,
            "status_color": status_color,
            "feature_agreement_ratio": agreement_ratio_str,
            "feature_agreement_pct": agreement_pct,
            "supporting_evidence_reasons": supporting_reasons,
            "evidence_breakdown": {
                "intensity_deviation": round(evidence_intensity, 4),
                "bilateral_asymmetry": round(evidence_asymmetry, 4),
                "texture_deviation": round(evidence_texture, 4),
                "local_abnormality": round(evidence_local, 4),
                "candidate_region_burden": round(evidence_regions, 4)
            }
        }

    return scored_zones
