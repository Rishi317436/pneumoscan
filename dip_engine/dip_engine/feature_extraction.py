"""
Comprehensive Feature Extraction Module for DIP Chest Radiograph Analysis.
Computes deterministic mathematical & texture descriptors for each lung zone and retrocardiac ROI:
1. First-Order Intensity Moments: Mean, Median, Std, Variance, Min, Max, Skewness, Kurtosis, Shannon Entropy.
2. GLCM Texture Features: Contrast, Dissimilarity, Homogeneity, Energy, Correlation.
3. Fractal Dimension: Box-counting algorithm on the regional intensity surface.
4. Superpixel Texture Features: Compactness, intra-superpixel variance, and gradient texture.
5. Edge Density & Opacity Profiling: Canny edge ratio, high/low opacity ratios, Michelson contrast.
"""

import cv2
import numpy as np
import scipy.stats as stats
from typing import Dict, Any, List, Tuple
from skimage.feature import graycomatrix, graycoprops, local_binary_pattern
from skimage.segmentation import slic
import config
from utils.image_utils import image_to_base64

CANNY_LOWER_THRESHOLD = getattr(config, "CANNY_LOWER_THRESHOLD", 80)
CANNY_UPPER_THRESHOLD = getattr(config, "CANNY_UPPER_THRESHOLD", 180)
LBP_POINTS = getattr(config, "LBP_POINTS", 8)
LBP_RADIUS = getattr(config, "LBP_RADIUS", 1)
GLCM_DISTANCES = getattr(config, "GLCM_DISTANCES", [1, 2])
GLCM_ANGLES = getattr(config, "GLCM_ANGLES", [0.0, 0.785398, 1.570796, 2.356194])
GLCM_LEVELS = getattr(config, "GLCM_LEVELS", 32)
OPACITY_STD_MULTIPLIER = getattr(config, "OPACITY_STD_MULTIPLIER", 0.8)


def calculate_shannon_entropy(pixels: np.ndarray) -> float:
    """
    Computes Shannon Entropy: H = - sum(p(i) * log2(p(i)))
    Measures information randomness and complexity in intensity distribution.
    """
    if len(pixels) == 0:
        return 0.0
    hist, _ = np.histogram(pixels, bins=256, range=(0, 256), density=True)
    hist = hist[hist > 0]
    return float(-np.sum(hist * np.log2(hist)))


def calculate_fractal_dimension(gray_image: np.ndarray, mask: np.ndarray) -> float:
    """
    Calculates Fractal Dimension using 2D differential box-counting on the zone's intensity surface.
    Roughness/consolidation leads to higher fractal dimension.
    """
    if gray_image.size == 0 or mask.size == 0 or np.sum(mask > 0) < 50:
        return 1.0

    zy, zx = np.where(mask > 0)
    if len(zy) == 0:
        return 1.0
    ymin, ymax = np.min(zy), np.max(zy)
    xmin, xmax = np.min(zx), np.max(zx)

    roi = gray_image[ymin:ymax+1, xmin:xmax+1]
    roi_mask = mask[ymin:ymax+1, xmin:xmax+1]

    h, w = roi.shape
    if min(h, w) < 8:
        return 1.0

    min_dim = min(h, w)
    scales = [2, 4, 8, 16]
    scales = [s for s in scales if s <= min_dim // 2]
    if len(scales) < 2:
        scales = [2, 4]

    counts = []
    for s in scales:
        num_boxes_y = h // s
        num_boxes_x = w // s
        box_count = 0
        for by in range(num_boxes_y):
            for bx in range(num_boxes_x):
                patch = roi[by*s:(by+1)*s, bx*s:(bx+1)*s]
                p_mask = roi_mask[by*s:(by+1)*s, bx*s:(bx+1)*s]
                if np.sum(p_mask > 0) > (s * s * 0.2):
                    valid_p = patch[p_mask > 0]
                    if len(valid_p) > 0:
                        g_range = float(np.max(valid_p)) - float(np.min(valid_p))
                        num_z_boxes = max(1, int(np.ceil(g_range / (256.0 / (256.0 / s)))))
                        box_count += num_z_boxes
        counts.append(max(1, box_count))

    if len(scales) >= 2:
        log_s = np.log([1.0 / s for s in scales])
        log_n = np.log(counts)
        slope, _ = np.polyfit(log_s, log_n, 1)
        fd = max(1.0, min(2.95, float(slope)))
    else:
        fd = 1.25

    return round(fd, 4)


def compute_superpixel_texture(
    cropped_bgr: np.ndarray,
    cropped_mask: np.ndarray
) -> Dict[str, float]:
    """
    Computes superpixel-based regional texture homogeneity & intra-cluster variance.
    """
    if cropped_bgr.size == 0 or cropped_mask.size == 0 or np.sum(cropped_mask > 0) < 60:
        return {
            "superpixel_count": 0,
            "mean_superpixel_variance": 0.0,
            "superpixel_compactness": 0.0
        }

    h, w, _ = cropped_bgr.shape
    num_segments = max(4, min(25, int(np.sum(cropped_mask > 0) / 180)))

    try:
        segments = slic(
            cropped_bgr,
            n_segments=num_segments,
            compactness=10.0,
            sigma=1.0,
            start_label=1,
            channel_axis=-1
        )
        
        variances = []
        gray = cv2.cvtColor(cropped_bgr, cv2.COLOR_BGR2GRAY)
        
        unique_labels = np.unique(segments)
        valid_sp_count = 0
        for seg_val in unique_labels:
            sp_mask = (segments == seg_val) & (cropped_mask > 0)
            if np.sum(sp_mask) > 10:
                valid_sp_count += 1
                sp_pixels = gray[sp_mask]
                variances.append(float(np.var(sp_pixels)))

        mean_var = float(np.mean(variances)) if variances else 0.0
        
        return {
            "superpixel_count": valid_sp_count,
            "mean_superpixel_variance": round(mean_var, 3),
            "superpixel_compactness": round(float(np.std(variances)), 3) if variances else 0.0
        }
    except Exception:
        return {
            "superpixel_count": 0,
            "mean_superpixel_variance": 0.0,
            "superpixel_compactness": 0.0
        }


def compute_zone_edges(
    cropped_gray: np.ndarray,
    cropped_mask: np.ndarray
) -> Dict[str, Any]:
    """
    Performs Canny edge detection strictly masked to valid lung parenchyma.
    """
    if cropped_gray.size == 0 or cropped_mask.size == 0:
        return {
            "edge_density": 0.0,
            "edge_pixels_count": 0,
            "total_valid_pixels": 0,
            "edge_image_b64": ""
        }

    raw_edges = cv2.Canny(
        cropped_gray,
        CANNY_LOWER_THRESHOLD,
        CANNY_UPPER_THRESHOLD
    )

    valid_mask = (cropped_mask > 0).astype(np.uint8)
    masked_edges = cv2.bitwise_and(raw_edges, raw_edges, mask=valid_mask)

    total_valid = int(np.sum(valid_mask > 0))
    edge_pixels = int(np.sum(masked_edges > 0))
    edge_density = round(float(edge_pixels / total_valid), 5) if total_valid > 0 else 0.0

    edge_viz = cv2.cvtColor(masked_edges, cv2.COLOR_GRAY2BGR)
    edge_viz[masked_edges > 0] = [255, 220, 0]

    return {
        "edge_density": edge_density,
        "edge_pixels_count": edge_pixels,
        "total_valid_pixels": total_valid,
        "edge_image_b64": image_to_base64(edge_viz),
        "raw_edge_array": masked_edges
    }


def compute_intensity_stats(valid_pixels: np.ndarray) -> Dict[str, float]:
    """
    Calculates primary statistical moments, higher-order moments, contrast, and Shannon entropy.
    """
    if len(valid_pixels) == 0:
        return {
            "mean": 0.0,
            "median": 0.0,
            "std_dev": 0.0,
            "variance": 0.0,
            "min_intensity": 0.0,
            "max_intensity": 0.0,
            "dynamic_range": 0.0,
            "contrast_ratio": 0.0,
            "skewness": 0.0,
            "kurtosis": 0.0,
            "uniformity": 0.0,
            "entropy": 0.0
        }

    p_mean = float(np.mean(valid_pixels))
    p_med = float(np.median(valid_pixels))
    p_std = float(np.std(valid_pixels))
    p_var = float(np.var(valid_pixels))
    p_min = float(np.min(valid_pixels))
    p_max = float(np.max(valid_pixels))
    p_dyn = p_max - p_min
    
    contrast = float((p_max - p_min) / (p_max + p_min + 1e-6))
    
    p_skew = float(stats.skew(valid_pixels)) if p_std > 1e-4 else 0.0
    p_kurt = float(stats.kurtosis(valid_pixels)) if p_std > 1e-4 else 0.0
    
    hist, _ = np.histogram(valid_pixels, bins=256, range=(0, 256), density=True)
    uniformity = float(np.sum(hist ** 2))
    
    entropy = calculate_shannon_entropy(valid_pixels)

    return {
        "mean": round(p_mean, 2),
        "median": round(p_med, 2),
        "std_dev": round(p_std, 2),
        "variance": round(p_var, 2),
        "min_intensity": round(p_min, 2),
        "max_intensity": round(p_max, 2),
        "dynamic_range": round(p_dyn, 2),
        "contrast_ratio": round(contrast, 4),
        "skewness": round(p_skew, 4),
        "kurtosis": round(p_kurt, 4),
        "uniformity": round(uniformity, 6),
        "entropy": round(entropy, 4)
    }


def compute_zone_glcm(
    cropped_gray: np.ndarray,
    cropped_mask: np.ndarray
) -> Dict[str, float]:
    """
    Computes Haralick GLCM texture features averaged across 4 orientations (0, 45, 90, 135 deg).
    """
    if cropped_gray.size == 0 or cropped_mask.size == 0 or np.sum(cropped_mask > 0) < 25:
        return {
            "contrast": 0.0,
            "dissimilarity": 0.0,
            "homogeneity": 0.0,
            "energy": 0.0,
            "correlation": 0.0
        }

    quantized = (cropped_gray // 16).astype(np.uint8)
    quantized[cropped_mask == 0] = 0

    try:
        glcm = graycomatrix(
            quantized,
            distances=GLCM_DISTANCES,
            angles=GLCM_ANGLES,
            levels=16,
            symmetric=True,
            normed=True
        )

        return {
            "contrast": round(float(np.mean(graycoprops(glcm, 'contrast'))), 4),
            "dissimilarity": round(float(np.mean(graycoprops(glcm, 'dissimilarity'))), 4),
            "homogeneity": round(float(np.mean(graycoprops(glcm, 'homogeneity'))), 4),
            "energy": round(float(np.mean(graycoprops(glcm, 'energy'))), 4),
            "correlation": round(float(np.mean(graycoprops(glcm, 'correlation'))), 4)
        }
    except Exception:
        return {
            "contrast": 0.0,
            "dissimilarity": 0.0,
            "homogeneity": 0.0,
            "energy": 0.0,
            "correlation": 0.0
        }


def extract_zone_feature_vector(
    zone_data: Dict[str, Any],
    global_mean: float,
    global_std: float
) -> Dict[str, Any]:
    """
    Computes the complete multi-parametric feature suite for an individual zone or ROI.
    """
    cropped_gray = zone_data["cropped_gray"]
    cropped_mask = zone_data["cropped_mask"]
    cropped_bgr = zone_data.get("cropped_bgr", cv2.cvtColor(cropped_gray, cv2.COLOR_GRAY2BGR))

    valid_pixels = cropped_gray[cropped_mask > 0] if cropped_mask.size > 0 else np.array([])

    intensity_stats = compute_intensity_stats(valid_pixels)
    glcm_stats = compute_zone_glcm(cropped_gray, cropped_mask)
    fractal_dim = calculate_fractal_dimension(cropped_gray, cropped_mask)
    superpixel_stats = compute_superpixel_texture(cropped_bgr, cropped_mask)
    edge_res = compute_zone_edges(cropped_gray, cropped_mask)

    if len(valid_pixels) > 0:
        high_thresh = global_mean + (OPACITY_STD_MULTIPLIER * global_std)
        low_thresh = max(10.0, global_mean - (1.2 * global_std))
        high_ratio = round(float(np.sum(valid_pixels > high_thresh) / len(valid_pixels)), 4)
        low_ratio = round(float(np.sum(valid_pixels < low_thresh) / len(valid_pixels)), 4)
    else:
        high_ratio = 0.0
        low_ratio = 0.0

    return {
        "zone_id": zone_data["id"],
        "name": zone_data["name"],
        "valid_pixels": int(len(valid_pixels)),
        "histogram_stats": intensity_stats,
        "texture_stats": glcm_stats,
        "fractal_dimension": fractal_dim,
        "superpixel_stats": superpixel_stats,
        "edge_density": edge_res["edge_density"],
        "edge_pixels_count": edge_res["edge_pixels_count"],
        "high_intensity_ratio": high_ratio,
        "low_intensity_ratio": low_ratio,
        "local_contrast": intensity_stats["contrast_ratio"],
        "edge_image_b64": edge_res["edge_image_b64"]
    }
