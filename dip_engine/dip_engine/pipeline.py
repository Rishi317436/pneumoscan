"""
End-to-End Traditional DIP Analysis Pipeline Orchestrator.
Connects Stages 1 through 13:
Raw Bytes -> Preprocessing -> Image-Dependent Segmentation -> Lung Mask Refinement -> 
6-Zone Division + Retrocardiac ROI -> Feature Extraction (GLCM, Fractal, Superpixel) -> 
Local Abnormality Mapping -> Candidate Regions -> Bilateral Analysis ->
Multi-Feature Zone Scoring -> Quality Sanity Checks -> Final 3-Tier Rule-Based Decision.
"""

import time
import os
import sys
import cv2
import numpy as np
from typing import Dict, Any, Optional

# Ensure current dip_engine/dip_engine, parent dip_engine, and root are in sys.path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PARENT_DIR = os.path.dirname(CURRENT_DIR)
WORKSPACE_ROOT = os.path.dirname(PARENT_DIR)

for p in [CURRENT_DIR, PARENT_DIR, WORKSPACE_ROOT]:
    if p and os.path.exists(p) and p not in sys.path:
        sys.path.insert(0, p)

import config
from ml.lung_segmentation import MLLungSegmenter, image_to_base64
from ml.zone_division import divide_seven_anatomical_regions
from ml.feature_extraction import extract_seven_region_features
from ml.pneumonia_detector import PneumoniaDetector

import importlib.util

def _safe_import(module_name, obj_name):
    # 1. Try loading directly from CURRENT_DIR (sibling file in same directory)
    sibling_file = os.path.join(CURRENT_DIR, f"{module_name}.py")
    if os.path.exists(sibling_file):
        try:
            spec = importlib.util.spec_from_file_location(f"_nested_stage_{module_name}", sibling_file)
            mod = importlib.util.module_from_spec(spec)
            sys.modules[f"_nested_stage_{module_name}"] = mod
            spec.loader.exec_module(mod)
            if hasattr(mod, obj_name):
                return getattr(mod, obj_name)
        except Exception as e:
            pass

    # 2. Package import attempts
    attempts = [
        f"dip_engine.{module_name}",
        f"{module_name}",
        f"dip_engine.dip_engine.{module_name}"
    ]
    for mod_path in attempts:
        try:
            mod = __import__(mod_path, fromlist=[obj_name])
            if hasattr(mod, obj_name):
                return getattr(mod, obj_name)
        except Exception:
            continue
    raise ImportError(f"Cannot import {obj_name} from {module_name}")

run_preprocessing_pipeline = _safe_import("preprocess", "run_preprocessing_pipeline")
perform_lung_segmentation = _safe_import("segmentation", "perform_lung_segmentation")
refine_lung_masks = _safe_import("lung_mask", "refine_lung_masks")
divide_six_anatomical_zones = _safe_import("zone_division", "divide_six_anatomical_zones")
extract_zone_feature_vector = _safe_import("feature_extraction", "extract_zone_feature_vector")
compute_zone_histogram_moments = _safe_import("histogram_analysis", "compute_zone_histogram_moments")
analyze_zone_edges = _safe_import("edge_analysis", "analyze_zone_edges")
analyze_zone_lbp = _safe_import("texture_analysis", "analyze_zone_lbp")
analyze_zone_glcm = _safe_import("glcm_analysis", "analyze_zone_glcm")
generate_local_abnormality_map = _safe_import("local_analysis", "generate_local_abnormality_map")
extract_candidate_abnormal_regions = _safe_import("morphology", "extract_candidate_abnormal_regions")
compute_bilateral_asymmetry_suite = _safe_import("bilateral_analysis", "compute_bilateral_asymmetry_suite")
score_all_zones = _safe_import("zone_scoring", "score_all_zones")
make_final_decision = _safe_import("final_decision", "make_final_decision")

try:
    from utils.image_utils import sanitize_for_json
except ImportError:
    try:
        from dip_engine.utils.image_utils import sanitize_for_json
    except ImportError:
        def sanitize_for_json(obj):
            return obj

# Global singleton ML models (cached in RAM for instant inference)
_LUNG_SEGMENTER: Optional[MLLungSegmenter] = None
_PNEUMONIA_DETECTOR: Optional[PneumoniaDetector] = None

def get_ml_segmenter() -> MLLungSegmenter:
    global _LUNG_SEGMENTER
    if _LUNG_SEGMENTER is None:
        try:
            _LUNG_SEGMENTER = MLLungSegmenter()
        except Exception as e:
            print(f"[!] Warning initializing MLLungSegmenter: {e}")
            _LUNG_SEGMENTER = None
    return _LUNG_SEGMENTER

def get_pneumonia_detector() -> PneumoniaDetector:
    global _PNEUMONIA_DETECTOR
    if _PNEUMONIA_DETECTOR is None:
        try:
            _PNEUMONIA_DETECTOR = PneumoniaDetector()
        except Exception as e:
            print(f"[!] Warning initializing PneumoniaDetector: {e}")
            _PNEUMONIA_DETECTOR = None
    return _PNEUMONIA_DETECTOR



def run_dip_analysis_pipeline(
    raw_image_bytes: bytes,
    filename: str = "chest_xray.png",
    custom_params: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Executes the complete 13-stage deterministic Digital Image Processing analysis
    using 100% image-dependent anatomical segmentation.
    """
    start_time = time.time()
    params = custom_params or {}

    g_kernel = params.get("gaussian_kernel", config.GAUSSIAN_KERNEL_SIZE)
    c_clip = params.get("clahe_clip_limit", config.CLAHE_CLIP_LIMIT)
    c_grid = (params.get("clahe_grid_size", config.CLAHE_TILE_GRID_SIZE[0]), params.get("clahe_grid_size", config.CLAHE_TILE_GRID_SIZE[1]))
    canny_l = params.get("canny_lower", config.CANNY_LOWER_THRESHOLD)
    canny_u = params.get("canny_upper", config.CANNY_UPPER_THRESHOLD)
    m_kernel = params.get("morph_kernel_size", config.MORPH_KERNEL_SIZE)
    min_cand_area = params.get("min_abnormal_region_area", config.MIN_ABNORMAL_REGION_AREA)
    z_susp_thresh = params.get("zone_suspicious_threshold", config.ZONE_SUSPICIOUS_THRESHOLD)
    z_abn_thresh = params.get("zone_abnormal_threshold", config.ZONE_ABNORMAL_THRESHOLD)

    # ----------------------------------------------------
    # STAGES 1 - 6: Preprocessing & Contrast Enhancement
    # ----------------------------------------------------
    prep_res = run_preprocessing_pipeline(
        raw_bytes=raw_image_bytes,
        target_size=(config.PROCESSING_WIDTH, config.PROCESSING_HEIGHT),
        gaussian_kernel_size=g_kernel,
        clahe_clip_limit=c_clip,
        clahe_grid_size=c_grid,
        use_median_filter=config.USE_MEDIAN_FILTER
    )
    arrays = prep_res["arrays"]
    enhanced_gray = arrays["enhanced_gray"]
    original_bgr = arrays["original_bgr"]

    # ----------------------------------------------------
    # STAGE 7: Deterministic Multi-Stage Anatomical Lung Segmentation
    # ----------------------------------------------------
    seg_res = perform_lung_segmentation(
        enhanced_gray=enhanced_gray,
        original_bgr=original_bgr,
        morph_kernel_size=m_kernel
    )
    torso_mask = seg_res["torso_mask"]
    heart_mask = seg_res["heart_mask"]
    retrocardiac_roi = seg_res["retrocardiac_roi"]
    sanity_checks = seg_res["sanity"]
    seg_res_stats = seg_res["stats"]
    threshold_img = seg_res["threshold_image"]
    morph_open_img = seg_res["morph_open"]
    morph_closed_img = seg_res["morph_closed"]
    cc_vis_img = seg_res["cc_vis"]

    mask_res = refine_lung_masks(
        right_lung_raw=seg_res["right_lung_raw"],
        left_lung_raw=seg_res["left_lung_raw"],
        enhanced_gray=enhanced_gray,
        original_bgr=original_bgr,
        heart_mask=heart_mask,
        retrocardiac_roi=retrocardiac_roi
    )
    combined_lung_mask = mask_res["masks"]["combined"]
    right_lung_mask = mask_res["masks"]["right_lung"]
    left_lung_mask = mask_res["masks"]["left_lung"]

    # ----------------------------------------------------
    # STAGE 8 & 9: 7-Region Anatomical Partitioning (Curved Zones + Retrocardiac ROI)
    # ----------------------------------------------------
    zones_res = divide_seven_anatomical_regions(
        enhanced_gray=enhanced_gray,
        original_bgr=original_bgr,
        right_lung_mask=right_lung_mask,
        left_lung_mask=left_lung_mask,
        heart_mask=heart_mask,
        retrocardiac_roi=retrocardiac_roi
    )
    raw_zones = zones_res["zones"]

    # ----------------------------------------------------
    # Whole-Lung Baseline Statistics
    # ----------------------------------------------------
    all_lung_pixels = enhanced_gray[combined_lung_mask > 0]
    global_lung_stats = {
        "lung_mean": float(np.percentile(all_lung_pixels, 35.0)) if len(all_lung_pixels) > 0 else 90.0,
        "lung_std": float(np.std(all_lung_pixels)) if len(all_lung_pixels) > 0 else 35.0,
    }


    # ----------------------------------------------------
    # STAGE 10 (Part D): Local Abnormality Map
    # ----------------------------------------------------
    local_map_res = generate_local_abnormality_map(
        enhanced_gray=enhanced_gray,
        lung_mask=combined_lung_mask,
        original_bgr=original_bgr,
        window_size=config.LOCAL_WINDOW_SIZE,
        stride=config.LOCAL_WINDOW_STRIDE
    )
    heatmap_2d = local_map_res["heatmap_2d"]

    # ----------------------------------------------------
    # STAGE 10: Multi-Parametric Feature Extraction per Zone
    # ----------------------------------------------------
    raw_zone_features: Dict[str, Any] = {}
    extended_features: Dict[str, Any] = {}

    for z_id, z_data in raw_zones.items():
        c_gray = z_data["cropped_gray"]
        c_mask = z_data["cropped_mask"]

        # Compute comprehensive features (intensity, GLCM, fractal dimension, superpixels)
        ext_feat = extract_zone_feature_vector(
            zone_data=z_data,
            global_mean=global_lung_stats["lung_mean"],
            global_std=global_lung_stats["lung_std"]
        )
        extended_features[z_id] = ext_feat

        # Classical legacy features for backwards-compatible multi-indicator scoring
        valid_zone_pixels = c_gray[c_mask > 0] if c_mask.size > 0 else np.array([])
        hist_moments = compute_zone_histogram_moments(valid_zone_pixels)

        edge_feat = analyze_zone_edges(
            cropped_gray=c_gray,
            cropped_mask=c_mask,
            canny_lower=canny_l,
            canny_upper=canny_u
        )

        lbp_feat = analyze_zone_lbp(
            cropped_gray=c_gray,
            cropped_mask=c_mask,
            points=config.LBP_POINTS,
            radius=config.LBP_RADIUS
        )

        glcm_feat = analyze_zone_glcm(
            cropped_gray=c_gray,
            cropped_mask=c_mask,
            distances=config.GLCM_DISTANCES,
            levels=config.GLCM_LEVELS
        )

        cand_feat = extract_candidate_abnormal_regions(
            enhanced_gray=c_gray,
            heatmap_2d=heatmap_2d[z_data["crop_bbox"][1]:z_data["crop_bbox"][1]+z_data["crop_bbox"][3],
                                  z_data["crop_bbox"][0]:z_data["crop_bbox"][0]+z_data["crop_bbox"][2]],
            zone_mask=c_mask,
            original_bgr=z_data["cropped_bgr"],
            min_region_area=min_cand_area,
            morph_kernel_size=m_kernel
        )

        # Merge texture stats
        texture_combined = {**lbp_feat, **glcm_feat}

        # Extract local heatmap stats within zone
        z_heat_pixels = heatmap_2d[z_data["mask"] > 0] if np.sum(z_data["mask"] > 0) > 0 else np.array([])
        heat_mean = float(np.mean(z_heat_pixels)) if len(z_heat_pixels) > 0 else 0.0
        heat_p90 = float(np.percentile(z_heat_pixels, 90.0)) if len(z_heat_pixels) > 0 else 0.0

        raw_zone_features[z_id] = {
            "id": z_id,
            "name": z_data["name"],
            "short_name": z_data["short_name"],
            "lung": z_data["lung"],
            "tier": z_data["tier"],
            "color_hex": z_data["color_hex"],
            "valid_pixels": z_data["valid_pixels"],
            "histogram_stats": hist_moments,
            "texture_stats": texture_combined,
            "edge_density": edge_feat["edge_density"],
            "edge_pixels_count": edge_feat["edge_pixels_count"],
            "high_intensity_ratio": hist_moments["high_intensity_ratio"],
            "low_intensity_ratio": hist_moments["low_intensity_ratio"],
            "local_contrast": hist_moments["local_contrast"],
            "local_heatmap_mean": heat_mean,
            "local_heatmap_p90": heat_p90,
            "candidate_count": cand_feat["candidate_count"],
            "candidate_regions": cand_feat["candidate_regions"],
            "abnormal_area_ratio": cand_feat["abnormal_area_ratio"],
            "fractal_dimension": ext_feat["fractal_dimension"],
            "superpixel_stats": ext_feat["superpixel_stats"],
            "images": {
                "cropped_gray": image_to_base64(c_gray),
                "cropped_mask": image_to_base64(c_mask),
                "edge_vis": edge_feat["edge_image_b64"],
                "cand_vis": cand_feat["candidate_overlay_b64"]
            }
        }

    # ----------------------------------------------------
    # STAGE 12: Cross-Zone Bilateral Asymmetry Analysis
    # ----------------------------------------------------
    # Only compute on standard 6 zones
    six_zone_features = {k: v for k, v in raw_zone_features.items() if k != "retrocardiac"}
    bilateral_res = compute_bilateral_asymmetry_suite(six_zone_features)

    # ----------------------------------------------------
    # STAGE 11: Zone-Wise Multi-Indicator Scoring
    # ----------------------------------------------------
    weights = {
        "weight_intensity": params.get("weight_intensity", config.WEIGHT_INTENSITY),
        "weight_asymmetry": params.get("weight_asymmetry", config.WEIGHT_ASYMMETRY),
        "weight_texture": params.get("weight_texture", config.WEIGHT_TEXTURE),
        "weight_local_contrast": params.get("weight_local_contrast", config.WEIGHT_LOCAL_CONTRAST),
        "weight_candidate_regions": params.get("weight_candidate_regions", config.WEIGHT_CANDIDATE_REGIONS),
    }

    scored_zones = score_all_zones(
        raw_zone_features=six_zone_features,
        bilateral_results=bilateral_res,
        global_lung_stats=global_lung_stats,
        weights=weights,
        suspicious_threshold=z_susp_thresh,
        abnormal_threshold=z_abn_thresh
    )

    # Attach extended fractal & superpixel stats to scored zones
    for z_id in scored_zones:
        if z_id in extended_features:
            scored_zones[z_id]["fractal_dimension"] = extended_features[z_id]["fractal_dimension"]
            scored_zones[z_id]["superpixel_stats"] = extended_features[z_id]["superpixel_stats"]

    # ----------------------------------------------------
    # STAGE 13: Final Classical ML & Multi-Feature Synthesis
    # ----------------------------------------------------
    decision_res = make_final_decision(
        scored_zones=scored_zones,
        bilateral_results=bilateral_res
    )

    # ----------------------------------------------------
    # STAGE 13: Deterministic 3-Tier Multi-Feature Consensus Decision
    # ----------------------------------------------------
    final_case_category = decision_res["final_case_category"]
    final_result = decision_res["final_result"]
    evidence_score = decision_res["evidence_score"]
    abnormal_cnt = decision_res["abnormal_zone_count"]
    suspicious_cnt = decision_res["suspicious_zone_count"]
    normal_cnt = decision_res["normal_zone_count"]
    decision_reason = decision_res["decision_reason"]

    # Whole-lung candidate regions overlay
    full_cand_res = extract_candidate_abnormal_regions(
        enhanced_gray=enhanced_gray,
        heatmap_2d=heatmap_2d,
        zone_mask=combined_lung_mask,
        original_bgr=original_bgr,
        min_region_area=min_cand_area,
        morph_kernel_size=m_kernel
    )

    # Final composite diagnostic overlay
    final_composite_bgr = original_bgr.copy()
    color_mask = np.zeros_like(original_bgr)
    color_mask[combined_lung_mask > 0] = (255, 180, 0)
    final_composite_bgr = cv2.addWeighted(final_composite_bgr, 0.70, color_mask, 0.30, 0)
    cnts_all, _ = cv2.findContours(combined_lung_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    cv2.drawContours(final_composite_bgr, cnts_all, -1, (255, 120, 0), 2) # Blue

    if heart_mask is not None and np.sum(heart_mask > 0) > 0:
        cnts_h, _ = cv2.findContours(heart_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        cv2.drawContours(final_composite_bgr, cnts_h, -1, (240, 240, 240), 2)

    # Draw abnormal zone badges on final overlay
    for z_id, z_data in scored_zones.items():
        if z_data["status"] != "NORMAL":
            z_mask = raw_zones[z_id]["mask"]
            zy, zx = np.where(z_mask > 0)
            if len(zy) > 0:
                cx, cy = int(np.mean(zx)), int(np.mean(zy))
                badge_col = (0, 0, 255) if z_data["status"] == "ABNORMAL" else (0, 165, 255)
                cv2.circle(final_composite_bgr, (cx, cy), 12, badge_col, -1)
                cv2.putText(final_composite_bgr, "!", (cx - 3, cy + 4), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1)

    elapsed_ms = round((time.time() - start_time) * 1000.0, 2)

    pipeline_stages = [
        {"step": 1, "name": "Original X-Ray", "description": "Raw radiograph input check"},
        {"step": 2, "name": "Image Validation", "description": f"Standardized to {config.PROCESSING_WIDTH}x{config.PROCESSING_HEIGHT}"},
        {"step": 3, "name": "Grayscale Conversion", "description": "Luminance intensity channel extraction"},
        {"step": 4, "name": "Percentile Normalization", "description": "1% to 99% robust outlier clipping"},
        {"step": 5, "name": "Noise Reduction", "description": f"Gaussian {g_kernel}x{g_kernel} spatial smoothing"},
        {"step": 6, "name": "Contrast Enhancement", "description": f"CLAHE (Clip: {c_clip}, Grid: {c_grid[0]}x{c_grid[1]})"},
        {"step": 7, "name": "Lung Segmentation", "description": "Deep U-Net thoracic silhouette & retrocardiac isolation"},
        {"step": 8, "name": "Mask Refinement", "description": "Topological hole-filling, heart separation & multi-color overlays"},
        {"step": 9, "name": "7-Region Division", "description": "Curved anatomical zones + Retrocardiac ROI"},
        {"step": 10, "name": "Feature Extraction", "description": "175-D radiomics moments, Haralick GLCM, Fractal DBC & Superpixels"},
        {"step": 11, "name": "Zone-Wise Scoring", "description": "5-group evidence consensus & agreement calculation"},
        {"step": 12, "name": "Bilateral Comparison", "description": "Opposite hemithorax asymmetry indices"},
        {"step": 13, "name": "Classical ML Classification", "description": f"Support Vector Classifier: {final_result}"}
    ]

    # Structure all pipeline images for frontend
    pipeline_images = {
        "original_image": prep_res["images"]["original_image"],
        "grayscale_image": prep_res["images"]["grayscale_image"],
        "normalized_image": prep_res["images"]["normalized_image"],
        "filtered_image": prep_res["images"]["filtered_image"],
        "denoised_image": prep_res["images"]["denoised_image"],
        "clahe_image": prep_res["images"]["clahe_image"],
        "enhanced_image": prep_res["images"]["enhanced_image"],
        "threshold_image": image_to_base64(threshold_img),
        "morph_open_image": image_to_base64(morph_open_img),
        "morph_closed_image": image_to_base64(morph_closed_img),
        "connected_components": image_to_base64(cc_vis_img),
        "lung_mask": image_to_base64(combined_lung_mask),
        "lung_only": image_to_base64(cv2.bitwise_and(enhanced_gray, enhanced_gray, mask=combined_lung_mask)),
        "contours_overlay": zones_res.get("contours_overlay_b64", ""),
        "six_zone_image": zones_res["visualization_b64"],
        "abnormality_heatmap": local_map_res["heatmap_overlay_b64"],
        "candidate_regions": full_cand_res["candidate_overlay_b64"],
        "final_diagnostic_overlay": image_to_base64(final_composite_bgr)
    }

    # Format zone outputs matching schema
    serializable_zones = {}
    for z_id, z_data in scored_zones.items():
        serializable_zones[z_id] = {
            "id": z_data["id"],
            "name": z_data["name"],
            "short_name": z_data["short_name"],
            "lung": z_data["lung"],
            "tier": z_data["tier"],
            "color_hex": z_data["color_hex"],
            "valid_pixels": z_data["valid_pixels"],
            "score": z_data["score"],
            "status": z_data["status"],
            "status_color": z_data["status_color"],
            "feature_agreement_ratio": z_data["feature_agreement_ratio"],
            "feature_agreement_pct": z_data["feature_agreement_pct"],
            "evidence_breakdown": z_data["evidence_breakdown"],
            "histogram_stats": z_data["histogram_stats"],
            "texture_stats": z_data["texture_stats"],
            "fractal_dimension": z_data.get("fractal_dimension", 1.25),
            "superpixel_stats": z_data.get("superpixel_stats", {}),
            "edge_density": z_data["edge_density"],
            "edge_pixels_count": z_data["edge_pixels_count"],
            "high_intensity_ratio": z_data["high_intensity_ratio"],
            "low_intensity_ratio": z_data["low_intensity_ratio"],
            "local_contrast": z_data["local_contrast"],
            "bilateral_asymmetry_index": bilateral_res["zone_asymmetry_indices"].get(z_id, 0.0),
            "candidate_regions_count": z_data["candidate_count"],
            "candidate_regions": z_data["candidate_regions"],
            "supporting_evidence_reasons": z_data["supporting_evidence_reasons"],
            "images": z_data["images"]
        }

    # Include retrocardiac ROI in zone dictionary if present
    if "retrocardiac" in raw_zone_features:
        rc_f = raw_zone_features["retrocardiac"]
        serializable_zones["retrocardiac"] = {
            "id": "retrocardiac",
            "name": rc_f["name"],
            "short_name": rc_f["short_name"],
            "lung": rc_f["lung"],
            "tier": rc_f["tier"],
            "color_hex": rc_f["color_hex"],
            "valid_pixels": rc_f["valid_pixels"],
            "score": 0.0,
            "status": "NORMAL",
            "status_color": "#10B981",
            "feature_agreement_ratio": "0/5",
            "feature_agreement_pct": 0.0,
            "evidence_breakdown": {},
            "histogram_stats": rc_f["histogram_stats"],
            "texture_stats": rc_f["texture_stats"],
            "fractal_dimension": rc_f.get("fractal_dimension", 1.25),
            "superpixel_stats": rc_f.get("superpixel_stats", {}),
            "high_intensity_ratio": rc_f["high_intensity_ratio"],
            "low_intensity_ratio": rc_f["low_intensity_ratio"],
            "local_contrast": rc_f["local_contrast"],
            "bilateral_asymmetry_index": 0.0,
            "candidate_regions_count": rc_f["candidate_count"],
            "candidate_regions": rc_f["candidate_regions"],
            "supporting_evidence_reasons": [],
            "images": rc_f["images"]
        }

    # Map short uppercase keys as aliases for legacy dashboards
    alias_map = {
        "right_upper": "RUL",
        "right_middle": "RML",
        "right_lower": "RLL",
        "left_upper": "LUL",
        "left_middle": "LML",
        "left_lower": "LLL",
        "retrocardiac": "RC"
    }
    for long_k, short_k in alias_map.items():
        if long_k in serializable_zones:
            serializable_zones[short_k] = serializable_zones[long_k]


    output_dict = {
        "filename": filename,
        "processing_time_ms": elapsed_ms,
        "final_result": final_result,

        "final_case_category": final_case_category,
        "evidence_score": evidence_score,
        "abnormal_zone_count": abnormal_cnt,
        "suspicious_zone_count": suspicious_cnt,
        "normal_zone_count": normal_cnt,
        "affected_zones": decision_res["affected_zones"],
        "decision_reason": decision_reason,
        "supporting_evidence_summary": decision_res["supporting_evidence_summary"],
        "segmentation_quality": sanity_checks,
        "anatomical_stats": seg_res_stats,
        "enhancement_pipeline": {
            "stages": prep_res["enhancement_stages"],
            "stats": prep_res["stats"],
            "histograms": prep_res["histograms"]
        },
        "pipeline_stages": pipeline_stages,
        "pipeline_images": pipeline_images,
        "histograms": prep_res["histograms"],
        "zones": serializable_zones,
        "bilateral_comparison": bilateral_res["tier_comparisons"],
        "active_parameters": {
            "gaussian_kernel": g_kernel,
            "clahe_clip_limit": c_clip,
            "clahe_grid_size": c_grid[0],
            "canny_lower": canny_l,
            "canny_upper": canny_u,
            "morph_kernel_size": m_kernel,
            "min_abnormal_region_area": min_cand_area,
            "zone_suspicious_threshold": z_susp_thresh,
            "zone_abnormal_threshold": z_abn_thresh,
            "weights": weights
        },
        "medical_disclaimer": config.MEDICAL_DISCLAIMER
    }
    return sanitize_for_json(output_dict)

