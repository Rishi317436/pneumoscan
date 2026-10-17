"""
Lung Mask Refinement & Anatomical Transparent Overlay Module.
Executes:
- Stage 8: Topological Hole Filling, Curvature Smoothing, and Anatomical Mask Refinement.
- Transparent Multi-Color Anatomical Overlays:
  * Blue outline: Complete Right & Left lung masks.
  * White/Gray outline: Cardiac & mediastinal silhouette.
  * Purple translucent overlay: Retrocardiac analysis ROI.
- Produces final combined lung mask, segmented lung image, and transparent composite.
"""

import cv2
import numpy as np
from typing import Dict, Any, Tuple, Optional
from utils.image_utils import image_to_base64


def refine_lung_masks(
    right_lung_raw: np.ndarray,
    left_lung_raw: np.ndarray,
    enhanced_gray: np.ndarray,
    original_bgr: np.ndarray,
    heart_mask: Optional[np.ndarray] = None,
    retrocardiac_roi: Optional[np.ndarray] = None
) -> Dict[str, Any]:
    """
    Cleans, fills internal rib/vascular holes, regularizes curvature,
    and produces professional medical overlays.
    """
    h, w = enhanced_gray.shape
    mid_x = int(w * 0.50)

    right_lung = right_lung_raw.copy()
    left_lung = left_lung_raw.copy()

    # Step 1: Topological hole-filling (vascular markings & rib notches)
    for mask_obj in [right_lung, left_lung]:
        cnts, _ = cv2.findContours(mask_obj, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        for cnt in cnts:
            cv2.drawContours(mask_obj, [cnt], -1, 255, -1)
        
        # Curvature smoothing with elliptical structuring element
        mask_obj[:] = cv2.morphologyEx(
            mask_obj,
            cv2.MORPH_CLOSE,
            cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (21, 21))
        )

    # Step 2: Strict hemithorax separation across the central midline
    spine_sep = max(2, int(w * 0.020))
    right_lung[:, (mid_x - spine_sep):] = 0
    left_lung[:, :(mid_x + spine_sep)] = 0

    combined_lung_mask = cv2.bitwise_or(right_lung, left_lung)

    # Step 3: Segmented lung image (mask applied to radiograph)
    lung_only_gray = cv2.bitwise_and(enhanced_gray, enhanced_gray, mask=combined_lung_mask)
    lung_only_bgr = cv2.bitwise_and(original_bgr, original_bgr, mask=combined_lung_mask)

    # Step 4: Medical Transparent Overlays
    # 4.1 Contours Overlay: Blue outline (BGR: 255, 120, 0) for lungs, White (240, 240, 240) for Heart
    contours_overlay = original_bgr.copy()
    cnts_r, _ = cv2.findContours(right_lung, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    cnts_l, _ = cv2.findContours(left_lung, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    # Draw crisp Blue lung contours (BGR: (255, 130, 0))
    for c in cnts_r + cnts_l:
        if cv2.contourArea(c) > (h * w * 0.01):
            cv2.drawContours(contours_overlay, [c], -1, (255, 130, 0), 2, cv2.LINE_AA)

    # Draw White/Gray contour for heart/mediastinum
    if heart_mask is not None and np.sum(heart_mask > 0) > 0:
        cnts_h, _ = cv2.findContours(heart_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        for c in cnts_h:
            if cv2.contourArea(c) > (h * w * 0.01):
                cv2.drawContours(contours_overlay, [c], -1, (235, 235, 235), 2, cv2.LINE_AA)

    # Draw Purple highlight for retrocardiac region
    if retrocardiac_roi is not None and np.sum(retrocardiac_roi > 0) > 0:
        rc_color_layer = np.zeros_like(original_bgr)
        rc_color_layer[retrocardiac_roi > 0] = (200, 50, 180) # Purple in BGR
        contours_overlay = cv2.addWeighted(contours_overlay, 0.82, rc_color_layer, 0.18, 0)
        cnts_rc, _ = cv2.findContours(retrocardiac_roi, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        for c in cnts_rc:
            cv2.drawContours(contours_overlay, [c], -1, (220, 60, 200), 1, cv2.LINE_AA)

    # 4.2 Translucent Boundary Overlay (Soft Blue Fill + Blue Border)
    boundary_overlay = original_bgr.copy()
    color_mask = np.zeros_like(original_bgr)
    color_mask[combined_lung_mask > 0] = (240, 140, 30) # Translucent Sky Blue in BGR
    
    if retrocardiac_roi is not None and np.sum(retrocardiac_roi > 0) > 0:
        color_mask[retrocardiac_roi > 0] = (190, 40, 160) # Purple tint in retrocardiac

    boundary_overlay = cv2.addWeighted(boundary_overlay, 0.75, color_mask, 0.25, 0)
    for c in cnts_r + cnts_l:
        if cv2.contourArea(c) > (h * w * 0.01):
            cv2.drawContours(boundary_overlay, [c], -1, (255, 150, 0), 2, cv2.LINE_AA)
    
    if heart_mask is not None and np.sum(heart_mask > 0) > 0:
        cnts_h, _ = cv2.findContours(heart_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        for c in cnts_h:
            if cv2.contourArea(c) > (h * w * 0.01):
                cv2.drawContours(boundary_overlay, [c], -1, (240, 240, 240), 2, cv2.LINE_AA)

    total_pixels = h * w
    total_lung_pixels = int(np.sum(combined_lung_mask > 0))
    right_pixels = int(np.sum(right_lung > 0))
    left_pixels = int(np.sum(left_lung > 0))

    return {
        "masks": {
            "combined": combined_lung_mask,
            "right_lung": right_lung,
            "left_lung": left_lung,
            "heart_mask": heart_mask if heart_mask is not None else np.zeros((h, w), dtype=np.uint8),
            "retrocardiac_roi": retrocardiac_roi if retrocardiac_roi is not None else np.zeros((h, w), dtype=np.uint8)
        },
        "stats": {
            "total_lung_pixels": total_lung_pixels,
            "right_lung_pixels": right_pixels,
            "left_lung_pixels": left_pixels,
            "coverage_percentage": round(float(total_lung_pixels / total_pixels) * 100.0, 2)
        },
        "arrays": {
            "lung_only_gray": lung_only_gray,
            "lung_only_bgr": lung_only_bgr,
            "contours_overlay": contours_overlay,
            "boundary_overlay": boundary_overlay
        },
        "images": {
            "lung_mask": image_to_base64(combined_lung_mask),
            "lung_only": image_to_base64(lung_only_bgr),
            "contours_overlay": image_to_base64(contours_overlay),
            "boundary_overlay": image_to_base64(boundary_overlay)
        }
    }
