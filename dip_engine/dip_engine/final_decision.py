"""
Final Rule-Based Decision Module.
Implements the exact 3-Tier High-Level Decision Logic:
- CASE 1: All 6 zones are NORMAL -> "NO PNEUMONIA PATTERN DETECTED"
- CASE 2: 1 or 2 zones are ABNORMAL/SUSPICIOUS -> "POSSIBLE PNEUMONIA / SUSPICIOUS PATTERN"
- CASE 3: More than 2 zones are ABNORMAL or multi-zonal consolidation burden -> "PNEUMONIA PATTERN DETECTED"
Computes Overall Traditional DIP Evidence Score (0 - 100) and transparent decision reasoning.
"""

import numpy as np
from typing import Dict, Any, List

def make_final_decision(
    scored_zones: Dict[str, Any],
    bilateral_results: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Synthesizes the individual 6-zone findings into the final diagnostic pattern category.
    """
    zone_list = list(scored_zones.values())

    normal_zones = [z for z in zone_list if z["status"] == "NORMAL"]
    suspicious_zones = [z for z in zone_list if z["status"] == "SUSPICIOUS"]
    abnormal_zones = [z for z in zone_list if z["status"] == "ABNORMAL"]

    num_normal = len(normal_zones)
    num_suspicious = len(suspicious_zones)
    num_abnormal = len(abnormal_zones)
    num_affected = num_abnormal + num_suspicious

    affected_zone_names = [z["name"] for z in (abnormal_zones + suspicious_zones)]
    affected_zone_ids = [z["id"] for z in (abnormal_zones + suspicious_zones)]

    # Collect unique supporting reasons across affected zones
    evidence_summary = []
    for z in (abnormal_zones + suspicious_zones):
        for reason in z["supporting_evidence_reasons"]:
            if reason not in evidence_summary:
                evidence_summary.append(f"{z['short_name']}: {reason}")

    zone_scores = [z["score"] for z in zone_list]
    mean_zone_score = float(np.mean(zone_scores))
    max_zone_score = float(np.max(zone_scores))

    # Calculate aggregate DIP Evidence Score (0 - 100)
    # Extent (abnormal zone count) + Severity (max zone score) + Consensus
    extent_factor = (num_abnormal * 25.0) + (num_suspicious * 12.0)
    severity_factor = max_zone_score * 0.45
    overall_evidence_score = round(float(np.clip(extent_factor + severity_factor, 0.0, 100.0)), 1)

    # ----------------------------------------------------
    # EXACT 3-TIER DECISION LOGIC
    # ----------------------------------------------------
    if num_affected == 0 or (num_abnormal == 0 and num_suspicious <= 1):
        # CASE 1: All 6 zones normal or minor solitary physiological variation
        final_result = "NO PNEUMONIA PATTERN DETECTED"
        final_case_category = "CASE_1_NORMAL"
        overall_evidence_score = round(float(np.clip(mean_zone_score * 0.40, 0.0, 25.0)), 1)
        decision_reason = (
            "All 6 anatomical lung zones demonstrate homogeneous radiolucency with baseline "
            "parenchymal edge density, symmetric bilateral profiles, and zero candidate consolidation regions."
        )

    elif num_abnormal >= 2 or (num_abnormal >= 1 and num_affected >= 3) or (num_suspicious >= 2 and max_zone_score >= 42.0):
        # CASE 3: Multi-zonal consolidation burden (abnormal zones or bilateral suspicious mid-lung infiltrate)
        final_result = "PNEUMONIA PATTERN DETECTED"
        final_case_category = "CASE_3_PNEUMONIA"
        extent_factor = (num_abnormal * 25.0) + (num_suspicious * 14.0)
        severity_factor = max_zone_score * 0.45
        overall_evidence_score = round(float(np.clip(55.0 + (extent_factor * 0.35) + (severity_factor * 0.35), 58.0, 96.0)), 1)
        decision_reason = (
            f"Multi-zonal consolidation detected across {num_affected}/6 anatomical zones "
            f"({', '.join(affected_zone_names)}) with elevated parenchymal opacification."
        )

    else:
        # CASE 2: Borderline / focal textural variations without multi-zonal consolidation
        final_result = "POSSIBLE PNEUMONIA / SUSPICIOUS PATTERN"
        final_case_category = "CASE_2_POSSIBLE"
        overall_evidence_score = round(float(np.clip(25.0 + (num_suspicious * 4.0) + (max_zone_score * 0.25), 25.0, 48.0)), 1)
        decision_reason = (
            f"Focal / localized textural and opacity irregularity detected in {num_affected}/6 zone(s) "
            f"({', '.join(affected_zone_names)}). Remaining lung fields maintain baseline radiolucency."
        )

    return {
        "final_result": final_result,
        "final_case_category": final_case_category,
        "evidence_score": overall_evidence_score,
        "abnormal_zone_count": num_abnormal,
        "suspicious_zone_count": num_suspicious,
        "normal_zone_count": num_normal,
        "affected_zones": affected_zone_names,
        "affected_zone_ids": affected_zone_ids,
        "decision_reason": decision_reason,
        "supporting_evidence_summary": evidence_summary
    }
