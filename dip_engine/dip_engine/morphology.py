"""
Morphology & Candidate Abnormal Region Extraction Module.
Detects, filters, and characterizes localized candidate consolidation regions:
- Thresholds the local abnormality heatmap within the lung zone.
- Applies morphological opening and closing to bridge patchy alveolar infiltrates and discard noise.
- Differentiates normal cardiac silhouette from paracardiac / retrocardiac consolidation blobs.
- Extracts Area, Perimeter, Centroid, Bounding Box, Mean Intensity, and Local Contrast.
"""

import cv2
import numpy as np
from typing import Dict, Any, List, Tuple
from utils.image_utils import image_to_base64

def extract_candidate_abnormal_regions(
    enhanced_gray: np.ndarray,
    heatmap_2d: np.ndarray,
    zone_mask: np.ndarray,
    original_bgr: np.ndarray,
    min_region_area: int = 120,
    morph_kernel_size: int = 7
) -> Dict[str, Any]:
    """
    Identifies and segments candidate abnormal opacity blobs within a specific zone or entire lung,
    accurately rejecting smooth cardiac silhouette false positives while capturing true paracardiac infiltrates.
    """
    h, w = enhanced_gray.shape
    # Mask heatmap to zone
    z_heat = heatmap_2d.copy()
    z_heat[zone_mask == 0] = 0.0

    # Candidate threshold on calibrated local abnormality heatmap (>= 0.45 indicates distinct deviation)
    raw_binary = (z_heat >= 0.45).astype(np.uint8) * 255

    # Morphological cleaning & bridging
    k = morph_kernel_size if morph_kernel_size % 2 == 1 else morph_kernel_size + 1
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k))
    morph_open = cv2.morphologyEx(raw_binary, cv2.MORPH_OPEN, kernel, iterations=1)
    morph_cleaned = cv2.morphologyEx(morph_open, cv2.MORPH_CLOSE, kernel, iterations=2)

    # Rib-strip dissolution: circular opening dissolves thin horizontal rib artifacts
    # while preserving broad, amorphous pneumonia consolidation patches
    rib_dissolve_kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (13, 13))
    morph_cleaned = cv2.morphologyEx(morph_cleaned, cv2.MORPH_OPEN, rib_dissolve_kernel, iterations=1)

    # Connected component analysis for candidate regions
    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(morph_cleaned, connectivity=8)

    candidate_regions: List[Dict[str, Any]] = []
    total_abnormal_area = 0

    candidate_overlay = original_bgr.copy()

    for r_id in range(1, num_labels):
        area = int(stats[r_id, cv2.CC_STAT_AREA])
        bx = int(stats[r_id, cv2.CC_STAT_LEFT])
        by = int(stats[r_id, cv2.CC_STAT_TOP])
        bw = int(stats[r_id, cv2.CC_STAT_WIDTH])
        bh = int(stats[r_id, cv2.CC_STAT_HEIGHT])

        # Minimum area filter: reject tiny noise blobs
        if area < max(min_region_area, 280):
            continue

        # Aspect ratio filter: reject elongated rib-shaped strips
        # Ribs are thin horizontal bands (aspect ratio > 2.8)
        # Pneumonia infiltrates are amorphous cloud patches (aspect ratio 1.0 - 2.5)
        long_side = max(bw, bh)
        short_side = max(min(bw, bh), 1)
        aspect_ratio = float(long_side) / float(short_side)
        if aspect_ratio > 2.8:
            continue

        # Solidity filter: reject non-compact shapes (ribs have low solidity)
        r_mask = (labels == r_id).astype(np.uint8)
        cnts, _ = cv2.findContours(r_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not cnts:
            continue
        hull_area = cv2.contourArea(cv2.convexHull(cnts[0]))
        solidity = float(area) / float(hull_area) if hull_area > 0 else 0.0
        if solidity < 0.35:
            continue

        cx, cy = centroids[r_id]

        # Extract pixels within candidate blob
        r_pixels = enhanced_gray[r_mask > 0].astype(np.float32)
        if len(r_pixels) == 0:
            continue

        r_mean = float(np.mean(r_pixels))
        r_std = float(np.std(r_pixels))
        r_min = float(np.min(r_pixels))
        r_max = float(np.max(r_pixels))
        r_contrast = float((r_max - r_min) / (r_max + r_min + 1e-5))

        # Discard extremely uniform / smooth soft tissue shadows lacking textural variation
        if r_std < 10.0 and r_contrast < 0.15:
            continue

        # Perimeter calculation via contour
        perimeter = float(cv2.arcLength(cnts[0], True)) if cnts else 0.0

        candidate_regions.append({
            "id": len(candidate_regions) + 1,
            "area": area,
            "perimeter": round(perimeter, 2),
            "centroid": (round(float(cx), 1), round(float(cy), 1)),
            "bounding_box": (bx, by, bw, bh),
            "mean_intensity": round(r_mean, 2),
            "std_dev": round(r_std, 2),
            "contrast_ratio": round(r_contrast, 4)
        })

        total_abnormal_area += area

        # Draw candidate region contours and bounding boxes
        cv2.drawContours(candidate_overlay, cnts, -1, (0, 70, 255), 2)
        cv2.rectangle(candidate_overlay, (bx, by), (bx + bw, by + bh), (0, 180, 255), 1)
        cv2.circle(candidate_overlay, (int(cx), int(cy)), 3, (0, 255, 255), -1)

    valid_zone_pixels = int(np.sum(zone_mask > 0))
    abnormal_area_ratio = float(total_abnormal_area / valid_zone_pixels) if valid_zone_pixels > 0 else 0.0

    return {
        "candidate_regions": candidate_regions,
        "candidate_count": len(candidate_regions),
        "total_abnormal_area": total_abnormal_area,
        "abnormal_area_ratio": round(abnormal_area_ratio, 4),
        "morph_cleaned_mask": morph_cleaned,
        "candidate_overlay_bgr": candidate_overlay,
        "candidate_overlay_b64": image_to_base64(candidate_overlay)
    }
