"""
Local Windowed Abnormality Map Analysis Module.
Performs sliding tile / windowed statistical extraction within lung parenchyma:
1. Calculates local mean, local variance, local contrast, and local texture per window.
2. Differentiates normal uniform cardiac shadow from heterogeneous paracardiac / retrocardiac pneumonia.
3. Generates a continuous 2D Abnormality Heatmap overlaid with JET colormap on the X-ray.
"""

import cv2
import numpy as np
from typing import Dict, Any, Tuple
from utils.image_utils import image_to_base64, apply_heatmap_overlay

def generate_local_abnormality_map(
    enhanced_gray: np.ndarray,
    lung_mask: np.ndarray,
    original_bgr: np.ndarray,
    window_size: int = 24,
    stride: int = 8
) -> Dict[str, Any]:
    """
    Constructs a 2D local abnormality heatmap across the entire lung parenchyma,
    with physiological cardiac shadow correction to prevent false positive heart detection
    while retaining high sensitivity for paracardiac & retrocardiac pneumonia opacities.
    """
    h, w = enhanced_gray.shape
    heatmap_raw = np.zeros((h, w), dtype=np.float32)
    weight_map = np.zeros((h, w), dtype=np.float32)

    valid_lung_pixels = enhanced_gray[lung_mask > 0]
    if len(valid_lung_pixels) < 50:
        return {
            "heatmap_2d": heatmap_raw,
            "heatmap_overlay_bgr": original_bgr,
            "heatmap_overlay_b64": image_to_base64(original_bgr),
            "mean_abnormality": 0.0,
            "max_abnormality": 0.0
        }

    # Patient's internal lung baseline (35th percentile represents healthy aerated parenchyma)
    lung_mean = float(np.percentile(valid_lung_pixels, 35.0))
    lung_std = float(np.std(valid_lung_pixels)) + 1e-4

    half_w = window_size // 2

    # Slide window across image
    for y in range(half_w, h - half_w, stride):
        for x in range(half_w, w - half_w, stride):
            if lung_mask[y, x] == 0:
                continue

            w_mask = lung_mask[y - half_w : y + half_w, x - half_w : x + half_w]
            if np.sum(w_mask > 0) < (window_size * window_size * 0.25):
                continue

            w_pixels = enhanced_gray[y - half_w : y + half_w, x - half_w : x + half_w]
            valid_w = w_pixels[w_mask > 0].astype(np.float32)

            if len(valid_w) < 10:
                continue

            loc_mean = float(np.mean(valid_w))
            loc_std = float(np.std(valid_w))
            loc_max = float(np.max(valid_w))
            loc_min = float(np.min(valid_w))

            # 1. Intensity elevation (radiopacity / consolidation above baseline)
            z_mean = max(0.0, (loc_mean - lung_mean) / (1.5 * lung_std))
            # 2. Local texture heterogeneity
            z_std = max(0.0, (loc_std - 18.0) / (lung_std + 1.0))
            # 3. Local Michelson contrast
            loc_contrast = max(0.0, ((loc_max - loc_min) / (loc_max + loc_min + 1e-5)) - 0.25)

            # Check if this window is in the physiological cardiac silhouette area (lower-medial)
            is_in_cardiac_zone = (0.42 * h <= y <= 0.85 * h) and (0.38 * w <= x <= 0.66 * w)
            
            if is_in_cardiac_zone:
                # Normal heart muscle has smooth uniform texture (low loc_std, low contrast)
                # True paracardiac/retrocardiac pneumonia has high intensity AND high texture heterogeneity
                is_smooth_cardiac_tissue = (loc_std < 18.0) and (loc_contrast < 0.20)
                if is_smooth_cardiac_tissue:
                    # Normal heart: suppress false alarm
                    tile_score = (0.10 * z_mean) + (0.40 * z_std) + (0.20 * loc_contrast)
                else:
                    # Paracardiac / Retrocardiac pneumonia: maintain high sensitivity!
                    tile_score = (0.55 * z_mean) + (0.30 * z_std) + (0.15 * loc_contrast)
            else:
                tile_score = (0.50 * z_mean) + (0.30 * z_std) + (0.20 * loc_contrast)

            # Accumulate on heatmap
            heatmap_raw[y - half_w : y + half_w, x - half_w : x + half_w] += tile_score
            weight_map[y - half_w : y + half_w, x - half_w : x + half_w] += 1.0

    # Average overlapping contributions
    valid_weights = weight_map > 0
    heatmap_raw[valid_weights] /= weight_map[valid_weights]
    heatmap_raw[lung_mask == 0] = 0.0

    # Absolute calibrated normalization into [0.0, 1.0] (Score of 1.2+ is severe consolidation)
    norm_heat = np.clip(heatmap_raw / 1.10, 0.0, 1.0)

    # Generate visual overlay on original radiograph
    heat_overlay_bgr = apply_heatmap_overlay(
        base_image=original_bgr,
        heatmap_2d=norm_heat,
        mask=lung_mask,
        colormap=cv2.COLORMAP_JET,
        alpha=0.45
    )

    mean_abnormality = float(np.mean(norm_heat[lung_mask > 0])) if np.sum(lung_mask > 0) > 0 else 0.0
    max_abnormality = float(np.max(norm_heat[lung_mask > 0])) if np.sum(lung_mask > 0) > 0 else 0.0

    return {
        "heatmap_2d": norm_heat,
        "heatmap_overlay_bgr": heat_overlay_bgr,
        "heatmap_overlay_b64": image_to_base64(heat_overlay_bgr),
        "mean_abnormality": round(mean_abnormality, 4),
        "max_abnormality": round(max_abnormality, 4)
    }
