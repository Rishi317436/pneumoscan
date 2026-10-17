"""
Edge Detection & Density Analysis Module.
Executes Canny edge detection restricted strictly to valid lung parenchyma pixels.
"""

import cv2
import numpy as np
from typing import Dict, Any
from utils.image_utils import image_to_base64

def analyze_zone_edges(
    cropped_gray: np.ndarray,
    cropped_mask: np.ndarray,
    canny_lower: int = 80,
    canny_upper: int = 180
) -> Dict[str, Any]:
    """
    Computes Canny edge map and parenchymal edge density for a specific lung zone.
    """
    if cropped_gray.size == 0 or cropped_mask.size == 0:
        return {
            "edge_density": 0.0,
            "edge_pixels_count": 0,
            "total_valid_pixels": 0,
            "edge_image_b64": "",
            "edge_mask_array": np.zeros((1, 1), dtype=np.uint8)
        }

    raw_edges = cv2.Canny(cropped_gray, canny_lower, canny_upper)
    valid_mask = (cropped_mask > 0).astype(np.uint8)
    masked_edges = cv2.bitwise_and(raw_edges, raw_edges, mask=valid_mask)

    total_valid = int(np.sum(valid_mask > 0))
    edge_pixels = int(np.sum(masked_edges > 0))
    edge_density = float(edge_pixels / total_valid) if total_valid > 0 else 0.0

    # High-contrast colorization (Cyan on black)
    edge_bgr = np.zeros((cropped_gray.shape[0], cropped_gray.shape[1], 3), dtype=np.uint8)
    edge_bgr[masked_edges > 0] = (255, 230, 0) # Cyan in BGR

    return {
        "edge_density": round(edge_density, 5),
        "edge_pixels_count": edge_pixels,
        "total_valid_pixels": total_valid,
        "edge_image_b64": image_to_base64(edge_bgr),
        "edge_mask_array": masked_edges
    }
