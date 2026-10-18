"""
Preprocessing Module for Digital Image Processing (DIP) Pipeline.
Executes:
- Stage 2: Radiograph Image Validation & Dimension Standardization
- Stage 3: Grayscale Luminance Conversion
- Stage 4: Robust Percentile-Based Dynamic Range Normalization (1% - 99%)
- Stage 5: Gaussian Spatial Noise Reduction (5x5 / Configurable Kernel)
- Stage 6: Contrast-Limited Adaptive Histogram Equalization (CLAHE)
"""

import cv2
import numpy as np
from typing import Dict, Any, Tuple
from utils.image_utils import image_to_base64, compute_histogram

def run_preprocessing_pipeline(
    raw_bytes: bytes,
    target_size: Tuple[int, int] = (512, 512),
    gaussian_kernel_size: int = 5,
    clahe_clip_limit: float = 2.0,
    clahe_grid_size: Tuple[int, int] = (8, 8),
    use_median_filter: bool = False
) -> Dict[str, Any]:
    """
    Executes deterministic multi-step preprocessing on the raw radiograph bytes.
    """
    # Stage 2: Image Validation & Decoding
    nparr = np.frombuffer(raw_bytes, np.uint8)
    original_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if original_bgr is None or original_bgr.size == 0:
        raise ValueError("Invalid or corrupted image format. Please upload a valid PNG, JPG, or JPEG radiograph.")

    orig_h, orig_w, orig_c = original_bgr.shape
    if orig_h < 64 or orig_w < 64:
        raise ValueError(f"Image resolution too low ({orig_w}x{orig_h}). Minimum 64x64 required.")

    # Aspect-Ratio Preserving Letterbox Padding to target_size (e.g. 512x512)
    # Eliminates squashing and anatomical distortion on pediatric & non-square radiographs
    scale = min(target_size[0] / float(orig_w), target_size[1] / float(orig_h))
    new_w = max(1, int(round(orig_w * scale)))
    new_h = max(1, int(round(orig_h * scale)))

    interp = cv2.INTER_AREA if (orig_w > new_w or orig_h > new_h) else cv2.INTER_CUBIC
    scaled_bgr = cv2.resize(original_bgr, (new_w, new_h), interpolation=interp)

    pad_left = (target_size[0] - new_w) // 2
    pad_top = (target_size[1] - new_h) // 2

    resized_bgr = np.zeros((target_size[1], target_size[0], orig_c), dtype=np.uint8)
    resized_bgr[pad_top:pad_top + new_h, pad_left:pad_left + new_w] = scaled_bgr

    # Stage 3: Grayscale Conversion
    # Converts 3-channel RGB/BGR radiograph into a single calibrated intensity channel
    gray_raw = cv2.cvtColor(resized_bgr, cv2.COLOR_BGR2GRAY)

    # Stage 4: Robust Percentile-Based Normalization
    # Mitigates bright markers, lead labels, black borders, and pacemaker wires
    p_low = float(np.percentile(gray_raw, 1.0))
    p_high = float(np.percentile(gray_raw, 99.0))
    if p_high <= p_low:
        p_low, p_high = 0.0, 255.0

    normalized_float = np.clip((gray_raw.astype(np.float32) - p_low) / (p_high - p_low + 1e-5), 0.0, 1.0)
    normalized_gray = (normalized_float * 255.0).astype(np.uint8)

    # Stage 5: Mild Noise Reduction (Gentle Gaussian Smoothing)
    k = gaussian_kernel_size if gaussian_kernel_size % 2 == 1 else gaussian_kernel_size + 1
    filtered_gray = cv2.GaussianBlur(normalized_gray, (k, k), sigmaX=0.8)
    if use_median_filter:
        filtered_gray = cv2.medianBlur(filtered_gray, k)

    # Stage 6: Contrast-Limited Adaptive Histogram Equalization (CLAHE)
    clahe = cv2.createCLAHE(
        clipLimit=clahe_clip_limit,
        tileGridSize=clahe_grid_size
    )
    clahe_gray = clahe.apply(filtered_gray)

    # Clean enhanced grayscale (Directly uses CLAHE, avoiding aggressive unsharp artifacts)
    enhanced_gray = clahe_gray

    # Calculate before/after histograms for UI inspection
    hist_raw = compute_histogram(gray_raw, bins=64)
    hist_norm = compute_histogram(normalized_gray, bins=64)
    hist_clahe = compute_histogram(clahe_gray, bins=64)

    # Calculate contrast and sharpness metrics
    raw_contrast = float(np.std(gray_raw))
    enh_contrast = float(np.std(enhanced_gray))
    laplacian_var_raw = float(cv2.Laplacian(gray_raw, cv2.CV_64F).var())
    laplacian_var_enh = float(cv2.Laplacian(enhanced_gray, cv2.CV_64F).var())

    enhancement_stages = [
        {
            "id": "original",
            "name": "1. Original X-Ray",
            "technique": "Raw Input Acquisition",
            "description": f"Standardized resolution to {target_size[0]}×{target_size[1]} with aspect-aware interpolation.",
            "image": image_to_base64(resized_bgr),
            "stats": {"Dimensions": f"{orig_w}×{orig_h}", "Channels": orig_c, "Mean": round(float(np.mean(resized_bgr)), 1)}
        },
        {
            "id": "grayscale",
            "name": "2. Grayscale Conversion",
            "technique": "Luminance ITU-R BT.601 (Y = 0.299R + 0.587G + 0.114B)",
            "description": "Extracts calibrated single-channel radiodensity intensity values, eliminating color channel bias.",
            "image": image_to_base64(gray_raw),
            "stats": {"Mean Intensity": round(float(np.mean(gray_raw)), 1), "Std Dev": round(raw_contrast, 1), "Dynamic Range": f"{int(np.min(gray_raw))}-{int(np.max(gray_raw))}"}
        },
        {
            "id": "normalized",
            "name": "3. Percentile Normalization",
            "technique": "Robust 1%–99% Min-Max Contrast Stretching",
            "description": "Eliminates high-density lead markers, border artifacts, and pacemakers by clamping outliers to [0, 255].",
            "image": image_to_base64(normalized_gray),
            "stats": {"1st Percentile": round(p_low, 1), "99th Percentile": round(p_high, 1), "Mean": round(float(np.mean(normalized_gray)), 1)}
        },
        {
            "id": "denoised",
            "name": "4. Mild Noise Reduction",
            "technique": f"Mild Gaussian Filter ({k}×{k}, σ=0.8)",
            "description": "Attenuates quantum mottle and high-frequency scattering while strictly preserving anatomical edge margins.",
            "image": image_to_base64(filtered_gray),
            "stats": {"Kernel": f"{k}×{k}", "Variance": round(float(np.var(filtered_gray)), 1)}
        },
        {
            "id": "clahe",
            "name": "5. Adaptive Histogram Equalization (CLAHE)",
            "technique": f"Tile Grid {clahe_grid_size[0]}×{clahe_grid_size[1]} with Clip Limit {clahe_clip_limit}",
            "description": "Locally redistributes intra-thoracic contrast in overlapping contextual tiles to reveal subtle infiltrates.",
            "image": image_to_base64(clahe_gray),
            "stats": {"Clip Limit": clahe_clip_limit, "Grid Size": f"{clahe_grid_size[0]}×{clahe_grid_size[1]}", "Std Dev": round(float(np.std(clahe_gray)), 1)}
        }
    ]

    return {
        "arrays": {
            "original_bgr": resized_bgr,
            "raw_gray": gray_raw,
            "normalized_gray": normalized_gray,
            "filtered_gray": filtered_gray,
            "clahe_gray": clahe_gray,
            "enhanced_gray": enhanced_gray
        },
        "stats": {
            "original_width": orig_w,
            "original_height": orig_h,
            "channels": orig_c,
            "target_dimensions": f"{target_size[0]}x{target_size[1]}",
            "percentile_low_1": round(p_low, 2),
            "percentile_high_99": round(p_high, 2),
            "gaussian_kernel": f"{k}x{k}",
            "clahe_clip_limit": clahe_clip_limit,
            "clahe_grid_size": f"{clahe_grid_size[0]}x{clahe_grid_size[1]}",
            "mean_intensity_raw": round(float(np.mean(gray_raw)), 2),
            "mean_intensity_normalized": round(float(np.mean(normalized_gray)), 2),
            "std_dev_enhanced": round(float(np.std(enhanced_gray)), 2),
            "raw_contrast": round(raw_contrast, 2),
            "enhanced_contrast": round(enh_contrast, 2),
            "raw_sharpness": round(laplacian_var_raw, 2),
            "enhanced_sharpness": round(laplacian_var_enh, 2)
        },
        "histograms": {
            "raw": hist_raw,
            "normalized": hist_norm,
            "clahe": hist_clahe,
            "enhanced": hist_clahe,
            "before_clahe": hist_norm,
            "after_clahe": hist_clahe
        },
        "enhancement_stages": enhancement_stages,
        "images": {
            "original_image": image_to_base64(resized_bgr),
            "grayscale_image": image_to_base64(gray_raw),
            "normalized_image": image_to_base64(normalized_gray),
            "filtered_image": image_to_base64(filtered_gray),
            "denoised_image": image_to_base64(filtered_gray),
            "clahe_image": image_to_base64(clahe_gray),
            "enhanced_image": image_to_base64(enhanced_gray)
        }
    }


# ML Preprocessing compatibility functions
import os
try:
    import config
    IMAGE_SIZE = getattr(config, "IMAGE_SIZE", (224, 224))
except Exception:
    IMAGE_SIZE = (224, 224)

def load_image(path):
    """Load image with OpenCV and validate."""
    if not os.path.exists(path):
        raise FileNotFoundError(f"Image not found: {path}")
    img = cv2.imread(path)
    if img is None:
        raise ValueError(f"Could not load image: {path}")
    return img

def to_grayscale(img):
    """Convert image to grayscale."""
    if len(img.shape) == 3:
        return cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    return img

def resize_image(img, size=IMAGE_SIZE):
    """Resize image to target dimensions."""
    return cv2.resize(img, size)

def to_rgb(img):
    """Ensure 3-channel RGB image."""
    if len(img.shape) == 2:
        return cv2.cvtColor(img, cv2.COLOR_GRAY2RGB)
    elif len(img.shape) == 3 and img.shape[2] == 3:
        return cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    return img

def normalize(img):
    """Normalize image array to [0,1] float32."""
    return img.astype(np.float32) / 255.0

def enhance_contrast(gray_img):
    """Apply CLAHE to grayscale image."""
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    return clahe.apply(gray_img)

def reduce_noise(gray_img):
    """Apply Gaussian blur to reduce noise."""
    return cv2.GaussianBlur(gray_img, (5, 5), 0)

def preprocess_for_ml(path):
    """Full preprocessing pipeline for ML models."""
    img = load_image(path)
    img = resize_image(img)
    img = to_rgb(img)
    return normalize(img)

def preprocess_for_manual(path):
    """Full preprocessing pipeline for manual feature extraction."""
    img = load_image(path)
    gray = to_grayscale(img)
    gray = resize_image(gray)
    gray = reduce_noise(gray)
    return enhance_contrast(gray)

