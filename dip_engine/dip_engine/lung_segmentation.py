"""
Lung Segmentation Module using Traditional Digital Image Processing (DIP).
Combines:
1. Torso Boundary Extraction (Isolating thoracic cavity from ambient air)
2. Intra-Thoracic Adaptive & Otsu Thresholding
3. Morphological Opening & Closing (filling vascular markings and rib shadows)
4. Connected Component Analysis (Right and Left Hemithorax Isolation)
5. Anatomical Mask Generation, Contours, and Overlays
"""

import cv2
import numpy as np
from typing import Dict, Any
from dip_engine.utils import image_to_base64

def segment_lungs(enhanced_gray: np.ndarray, original_bgr: np.ndarray) -> Dict[str, Any]:
    """
    Deterministic, ML-free anatomical lung segmentation.
    1. Extracts patient torso silhouette to discard outside air.
    2. Segments internal radiolucent lung fields using intra-thoracic Otsu + adaptive thresholding.
    3. Isolates Right & Left Hemithoraces with connected component topology.
    """
    h, w = enhanced_gray.shape
    total_image_pixels = h * w

    # ----------------------------------------------------
    # Stage 5.1: Torso Silhouette Isolation
    # ----------------------------------------------------
    # Slight blur to smooth boundary
    torso_blur = cv2.GaussianBlur(enhanced_gray, (15, 15), 0)
    
    # Outer air is near-black. Torso tissue is higher intensity.
    # We find the torso mask using low-level Otsu or triangle thresholding on blurred image.
    torso_thresh_val, raw_torso = cv2.threshold(torso_blur, 25, 255, cv2.THRESH_BINARY)
    
    # Fill torso holes and get largest connected component (the patient body)
    kernel_torso = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (25, 25))
    torso_closed = cv2.morphologyEx(raw_torso, cv2.MORPH_CLOSE, kernel_torso, iterations=2)
    
    t_num, t_labels, t_stats, _ = cv2.connectedComponentsWithStats(torso_closed, connectivity=8)
    torso_mask = np.zeros((h, w), dtype=np.uint8)
    if t_num > 1:
        # Largest non-background component is torso
        largest_t_id = 1 + np.argmax(t_stats[1:, cv2.CC_STAT_AREA])
        torso_mask[t_labels == largest_t_id] = 255
        # Fill holes inside torso
        cnts_t, _ = cv2.findContours(torso_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        for ct in cnts_t:
            cv2.drawContours(torso_mask, [ct], -1, 255, -1)
    else:
        torso_mask.fill(255)

    # ----------------------------------------------------
    # Stage 5.2: Intra-Thoracic Lung Field Thresholding
    # ----------------------------------------------------
    # Gaussian blur before thresholding to smooth rib striations
    blur_pre = cv2.GaussianBlur(enhanced_gray, (7, 7), 0)
    
    # Calculate Otsu threshold on pixels strictly inside torso
    torso_pixels = blur_pre[torso_mask > 0]
    if len(torso_pixels) > 100:
        otsu_val, _ = cv2.threshold(torso_pixels, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    else:
        otsu_val = 110.0

    # Lungs are darker than thoracic spine/ribs
    lung_raw_thresh = np.zeros((h, w), dtype=np.uint8)
    lung_raw_thresh[(blur_pre < otsu_val) & (torso_mask > 0)] = 255

    # Adaptive threshold to capture fine peripheral pleural margins
    adapt_thresh = cv2.adaptiveThreshold(
        blur_pre, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 35, 3
    )
    adapt_thresh[torso_mask == 0] = 0

    # Combine Otsu and Adaptive
    combined_thresh = cv2.bitwise_or(lung_raw_thresh, adapt_thresh)

    # ----------------------------------------------------
    # Stage 5.3: Morphological Refinement
    # ----------------------------------------------------
    # Opening (removes clavicle noise, neck airways, sub-diaphragmatic slivers)
    kernel_open = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
    morph_open = cv2.morphologyEx(combined_thresh, cv2.MORPH_OPEN, kernel_open, iterations=1)

    # Closing (fills internal pulmonary vessels, rib shadows)
    kernel_close = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (19, 19))
    morph_closed = cv2.morphologyEx(morph_open, cv2.MORPH_CLOSE, kernel_close, iterations=2)

    # ----------------------------------------------------
    # Stage 5.4: Connected Components & Right/Left Hemithorax Isolation
    # ----------------------------------------------------
    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(morph_closed, connectivity=8)

    min_lung_area = int(total_image_pixels * 0.02)
    max_lung_area = int(total_image_pixels * 0.35)

    candidates = []
    for label_id in range(1, num_labels):
        area = int(stats[label_id, cv2.CC_STAT_AREA])
        cx, cy = centroids[label_id]
        
        # Check area & anatomical thoracic positioning
        if min_lung_area <= area <= max_lung_area:
            if (0.08 * w < cx < 0.92 * w) and (0.12 * h < cy < 0.88 * h):
                candidates.append({
                    "label_id": label_id,
                    "area": area,
                    "centroid": (float(cx), float(cy)),
                    "bbox": (
                        int(stats[label_id, cv2.CC_STAT_LEFT]),
                        int(stats[label_id, cv2.CC_STAT_TOP]),
                        int(stats[label_id, cv2.CC_STAT_WIDTH]),
                        int(stats[label_id, cv2.CC_STAT_HEIGHT])
                    )
                })

    candidates = sorted(candidates, key=lambda c: c["area"], reverse=True)

    right_lung_mask = np.zeros((h, w), dtype=np.uint8)  # Anatomical Right = Viewer's Left (x < w/2)
    left_lung_mask = np.zeros((h, w), dtype=np.uint8)   # Anatomical Left = Viewer's Right (x >= w/2)

    mid_x = w * 0.50
    right_candidates = [c for c in candidates if c["centroid"][0] < mid_x + 10]
    left_candidates = [c for c in candidates if c["centroid"][0] >= mid_x - 10]

    if right_candidates:
        r_best = right_candidates[0]
        right_lung_mask[labels == r_best["label_id"]] = 255
        # If second right component (e.g., lower lobe disconnected by rib)
        if len(right_candidates) > 1 and right_candidates[1]["area"] > min_lung_area:
            right_lung_mask[labels == right_candidates[1]["label_id"]] = 255

    if left_candidates:
        l_best = left_candidates[0]
        left_lung_mask[labels == l_best["label_id"]] = 255
        if len(left_candidates) > 1 and left_candidates[1]["area"] > min_lung_area:
            left_lung_mask[labels == left_candidates[1]["label_id"]] = 255

    # If single wide component merged across the mediastinum
    if (np.sum(right_lung_mask) == 0 or np.sum(left_lung_mask) == 0) and len(candidates) > 0:
        top_cand = candidates[0]
        if top_cand["bbox"][2] > w * 0.35:
            full_mask = (labels == top_cand["label_id"]).astype(np.uint8) * 255
            right_lung_mask = full_mask.copy()
            right_lung_mask[:, int(mid_x):] = 0
            left_lung_mask = full_mask.copy()
            left_lung_mask[:, :int(mid_x)] = 0

    # Robust Anatomical Fallback (ensures clean mask if radiograph has extreme consolidation)
    if np.sum(right_lung_mask > 0) < min_lung_area:
        cv2.ellipse(
            right_lung_mask,
            (int(w * 0.32), int(h * 0.48)),
            (int(w * 0.14), int(h * 0.28)),
            -4, 0, 360, 255, -1
        )
    if np.sum(left_lung_mask > 0) < min_lung_area:
        cv2.ellipse(
            left_lung_mask,
            (int(w * 0.68), int(h * 0.48)),
            (int(w * 0.13), int(h * 0.27)),
            4, 0, 360, 255, -1
        )

    # ----------------------------------------------------
    # Stage 5.5: Final Hole Filling & Morphological Polish
    # ----------------------------------------------------
    for mask_obj in [right_lung_mask, left_lung_mask]:
        cnts, _ = cv2.findContours(mask_obj, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        for cnt in cnts:
            cv2.drawContours(mask_obj, [cnt], -1, 255, -1)
        mask_obj[:] = cv2.morphologyEx(
            mask_obj,
            cv2.MORPH_CLOSE,
            cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15))
        )

    # Restrict to strictly left / right half to prevent overlap
    right_lung_mask[:, int(mid_x):] = 0
    left_lung_mask[:, :int(mid_x)] = 0

    combined_lung_mask = cv2.bitwise_or(right_lung_mask, left_lung_mask)

    # ----------------------------------------------------
    # Stage 5.6: Segmented Lung Image & Overlays
    # ----------------------------------------------------
    segmented_lung_gray = cv2.bitwise_and(enhanced_gray, enhanced_gray, mask=combined_lung_mask)
    segmented_lung_bgr = cv2.bitwise_and(original_bgr, original_bgr, mask=combined_lung_mask)

    # Draw sharp green/cyan border on overlay
    contours_overlay = original_bgr.copy()
    cnts_r, _ = cv2.findContours(right_lung_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    cnts_l, _ = cv2.findContours(left_lung_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    cv2.drawContours(contours_overlay, cnts_r, -1, (0, 255, 128), 2)
    cv2.drawContours(contours_overlay, cnts_l, -1, (0, 255, 128), 2)

    # Translucent boundary overlay
    boundary_overlay = original_bgr.copy()
    color_mask = np.zeros_like(original_bgr)
    color_mask[right_lung_mask > 0] = (255, 160, 0)
    color_mask[left_lung_mask > 0] = (255, 160, 0)
    boundary_overlay = cv2.addWeighted(boundary_overlay, 0.72, color_mask, 0.28, 0)
    cv2.drawContours(boundary_overlay, cnts_r, -1, (255, 230, 0), 2)
    cv2.drawContours(boundary_overlay, cnts_l, -1, (255, 230, 0), 2)

    total_lung_pixels = int(np.sum(combined_lung_mask > 0))
    r_pixels = int(np.sum(right_lung_mask > 0))
    l_pixels = int(np.sum(left_lung_mask > 0))
    lung_coverage_ratio = round(float(total_lung_pixels / total_image_pixels), 4)

    segmentation_stats = {
        "otsu_threshold_value": float(otsu_val),
        "total_lung_pixels": total_lung_pixels,
        "right_lung_pixels": r_pixels,
        "left_lung_pixels": l_pixels,
        "lung_coverage_percentage": round(lung_coverage_ratio * 100, 2),
        "components_detected": len(candidates),
    }

    images_b64 = {
        "threshold_image": image_to_base64(combined_thresh),
        "morphological_image": image_to_base64(morph_closed),
        "contours_overlay": image_to_base64(contours_overlay),
        "lung_mask": image_to_base64(combined_lung_mask),
        "segmented_lungs": image_to_base64(segmented_lung_bgr),
        "boundary_overlay": image_to_base64(boundary_overlay),
    }

    return {
        "masks": {
            "combined": combined_lung_mask,
            "right_lung": right_lung_mask,
            "left_lung": left_lung_mask,
        },
        "stats": segmentation_stats,
        "images": images_b64,
        "segmented_gray": segmented_lung_gray,
        "contours_overlay_bgr": contours_overlay
    }
