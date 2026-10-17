"""
Image Utility Functions for Traditional DIP Pipeline.
Handles base64 encoding, color mapping, colormap overlays, and histogram calculations.
"""

import base64
import cv2
import numpy as np
from typing import List, Dict, Any, Optional

def image_to_base64(image: np.ndarray, format: str = ".png") -> str:
    """
    Encode an OpenCV image (grayscale or BGR) to base64 data URI.
    """
    if image is None or image.size == 0:
        return ""
    success, buffer = cv2.imencode(format, image)
    if not success:
        return ""
    b64_str = base64.b64encode(buffer).decode("utf-8")
    mime_type = "image/png" if format.lower() == ".png" else "image/jpeg"
    return f"data:{mime_type};base64,{b64_str}"

def compute_histogram(image: np.ndarray, mask: Optional[np.ndarray] = None, bins: int = 64) -> List[Dict[str, Any]]:
    """
    Computes normalized histogram distribution for visual inspection.
    """
    if len(image.shape) == 3:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    else:
        gray = image

    hist = cv2.calcHist([gray], [0], mask, [bins], [0, 256])
    hist_flat = hist.ravel()
    total_pixels = float(np.sum(hist_flat)) if np.sum(hist_flat) > 0 else 1.0

    step = 256.0 / bins
    result = []
    for i, count in enumerate(hist_flat):
        c = float(count)
        result.append({
            "bin": i,
            "intensity": round(i * step + step / 2, 1),
            "count": int(c),
            "frequency": round(c / total_pixels, 5)
        })
    return result

def apply_heatmap_overlay(
    base_image: np.ndarray,
    heatmap_2d: np.ndarray,
    mask: Optional[np.ndarray] = None,
    colormap: int = cv2.COLORMAP_JET,
    alpha: float = 0.45
) -> np.ndarray:
    """
    Overlays a normalized 2D float heatmap [0.0, 1.0] onto an image with translucent blending.
    Restricted strictly to the given mask if provided.
    """
    if len(base_image.shape) == 2:
        base_bgr = cv2.cvtColor(base_image, cv2.COLOR_GRAY2BGR)
    else:
        base_bgr = base_image.copy()

    # Scale heatmap to [0, 255] uint8
    norm_heat = np.clip(heatmap_2d * 255.0, 0, 255).astype(np.uint8)
    colored_heat = cv2.applyColorMap(norm_heat, colormap)

    # Blend
    blended = cv2.addWeighted(base_bgr, 1.0 - alpha, colored_heat, alpha, 0)

    if mask is not None:
        # Keep original image outside the mask
        result = base_bgr.copy()
        result[mask > 0] = blended[mask > 0]
        return result

    return blended

def safe_normalize(val: float, min_val: float, max_val: float) -> float:
    """
    Safely clamps and normalizes value to [0.0, 1.0].
    """
    if max_val <= min_val:
        return 0.0
    return float(np.clip((val - min_val) / (max_val - min_val), 0.0, 1.0))

def sanitize_for_json(obj: Any) -> Any:
    """
    Recursively converts numpy types (int, float, bool, ndarray) to standard Python JSON serializable types.
    """
    if isinstance(obj, (bool, np.bool_)):
        return bool(obj)
    elif isinstance(obj, (int, np.integer)):
        return int(obj)
    elif isinstance(obj, (float, np.floating)):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, dict):
        return {str(k): sanitize_for_json(v) for k, v in obj.items()}
    elif isinstance(obj, (list, tuple, set)):
        return [sanitize_for_json(item) for item in obj]
    return obj
