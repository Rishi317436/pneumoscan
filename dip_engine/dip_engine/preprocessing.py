"""
Preprocessing Module for Digital Image Processing (DIP) Pipeline.
Performs:
- Step 1: Grayscale Conversion & Initial Statistics
- Step 2: Dimension Standardization / Resizing
- Step 3: Gaussian Noise Reduction & Variance Profiling
- Step 4: CLAHE Contrast Enhancement & Histogram Profiling
"""

import cv2
import numpy as np
from typing import Dict, Any, Tuple
from config import (
    PROCESSING_WIDTH,
    PROCESSING_HEIGHT,
    GAUSSIAN_KERNEL_SIZE,
    CLAHE_CLIP_LIMIT,
    CLAHE_TILE_GRID_SIZE
)
from dip_engine.utils import image_to_base64, compute_histogram

def run_preprocessing(raw_image_bytes: bytes) -> Dict[str, Any]:
    """
    Executes traditional DIP preprocessing steps on raw uploaded image bytes.
    Returns processed arrays, statistics, and base64 encoded images.
    """
    # Decode image from bytes
    nparr = np.frombuffer(raw_image_bytes, np.uint8)
    original_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if original_bgr is None:
        raise ValueError("Could not decode image. Please provide a valid JPG, JPEG, or PNG chest X-ray file.")

    orig_h, orig_w, orig_c = original_bgr.shape

    # ----------------------------------------------------
    # STEP 1: Grayscale Conversion
    # ----------------------------------------------------
    gray_original = cv2.cvtColor(original_bgr, cv2.COLOR_BGR2GRAY)
    
    step1_stats = {
        "original_width": int(orig_w),
        "original_height": int(orig_h),
        "channels": int(orig_c),
        "min_intensity": float(np.min(gray_original)),
        "max_intensity": float(np.max(gray_original)),
        "mean_intensity": round(float(np.mean(gray_original)), 2),
        "std_intensity": round(float(np.std(gray_original)), 2),
    }

    # ----------------------------------------------------
    # STEP 2: Image Resizing
    # ----------------------------------------------------
    resized_gray = cv2.resize(
        gray_original,
        (PROCESSING_WIDTH, PROCESSING_HEIGHT),
        interpolation=cv2.INTER_AREA if (orig_w > PROCESSING_WIDTH or orig_h > PROCESSING_HEIGHT) else cv2.INTER_CUBIC
    )
    resized_bgr = cv2.resize(
        original_bgr,
        (PROCESSING_WIDTH, PROCESSING_HEIGHT),
        interpolation=cv2.INTER_AREA
    )

    step2_stats = {
        "target_width": PROCESSING_WIDTH,
        "target_height": PROCESSING_HEIGHT,
        "interpolation": "INTER_AREA / INTER_CUBIC",
    }

    # ----------------------------------------------------
    # STEP 3: Noise Reduction (Gaussian Filter)
    # ----------------------------------------------------
    ksize = (GAUSSIAN_KERNEL_SIZE, GAUSSIAN_KERNEL_SIZE)
    filtered_gray = cv2.GaussianBlur(resized_gray, ksize, sigmaX=0)

    step3_stats = {
        "kernel_size": f"{GAUSSIAN_KERNEL_SIZE}x{GAUSSIAN_KERNEL_SIZE}",
        "before_filter": {
            "mean": round(float(np.mean(resized_gray)), 2),
            "std_dev": round(float(np.std(resized_gray)), 2),
            "variance": round(float(np.var(resized_gray)), 2)
        },
        "after_filter": {
            "mean": round(float(np.mean(filtered_gray)), 2),
            "std_dev": round(float(np.std(filtered_gray)), 2),
            "variance": round(float(np.var(filtered_gray)), 2)
        },
        "noise_reduction_ratio": round(float((np.var(resized_gray) - np.var(filtered_gray)) / (np.var(resized_gray) + 1e-6)), 4)
    }

    # ----------------------------------------------------
    # STEP 4: Contrast Enhancement (CLAHE)
    # ----------------------------------------------------
    clahe = cv2.createCLAHE(
        clipLimit=CLAHE_CLIP_LIMIT,
        tileGridSize=CLAHE_TILE_GRID_SIZE
    )
    enhanced_gray = clahe.apply(filtered_gray)

    # Histograms before & after CLAHE
    hist_before = compute_histogram(filtered_gray, bins=64)
    hist_after = compute_histogram(enhanced_gray, bins=64)

    step4_stats = {
        "clip_limit": CLAHE_CLIP_LIMIT,
        "tile_grid_size": f"{CLAHE_TILE_GRID_SIZE[0]}x{CLAHE_TILE_GRID_SIZE[1]}",
        "before_clahe": {
            "mean": round(float(np.mean(filtered_gray)), 2),
            "std_dev": round(float(np.std(filtered_gray)), 2),
            "dynamic_range": [int(np.min(filtered_gray)), int(np.max(filtered_gray))]
        },
        "after_clahe": {
            "mean": round(float(np.mean(enhanced_gray)), 2),
            "std_dev": round(float(np.std(enhanced_gray)), 2),
            "dynamic_range": [int(np.min(enhanced_gray)), int(np.max(enhanced_gray))]
        },
        "hist_before": hist_before,
        "hist_after": hist_after
    }

    # Encode images to base64
    images_b64 = {
        "original_image": image_to_base64(resized_bgr),
        "grayscale_image": image_to_base64(resized_gray),
        "filtered_image": image_to_base64(filtered_gray),
        "enhanced_image": image_to_base64(enhanced_gray),
    }

    return {
        "arrays": {
            "original_bgr": resized_bgr,
            "original_gray": resized_gray,
            "filtered_gray": filtered_gray,
            "enhanced_gray": enhanced_gray,
        },
        "stats": {
            "step1_grayscale": step1_stats,
            "step2_resizing": step2_stats,
            "step3_noise_reduction": step3_stats,
            "step4_clahe": step4_stats,
        },
        "images": images_b64
    }
