"""
Utility functions for Digital Image Processing (DIP) pipeline.
Handles image conversions, histogram calculation, and base64 formatting.
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
    Compute normalized histogram distribution for visualization.
    Returns list of dicts: [{"bin": i, "intensity": center_val, "count": count, "frequency": freq}]
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

def normalize_feature(value: float, min_val: float, max_val: float) -> float:
    """
    Min-max linear clipping and normalization to [0.0, 1.0].
    """
    if max_val <= min_val:
        return 0.0
    norm = (value - min_val) / (max_val - min_val)
    return float(np.clip(norm, 0.0, 1.0))

def sanitize_for_json(obj: Any) -> Any:
    """
    Recursively converts numpy numbers, booleans, and arrays into standard Python JSON serializable types.
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

