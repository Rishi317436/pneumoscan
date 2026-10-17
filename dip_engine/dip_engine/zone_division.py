"""
Mask-Derived Six-Zone Anatomical Division & Medical Visualization Module.
Executes:
- Stage 9: Tri-Zonal Vertical Partition (Upper 0-33.3%, Middle 33.3-66.6%, Lower 66.6-100%)
  computed independently on the anatomical vertical span of each hemithorax mask.
- Strictly intersects each partition with the segmented lung mask:
  `zone_mask = lung_mask & tier_slice` -> Zones follow true curved anatomical boundaries.
- Dedicated Retrocardiac Analysis ROI integration.
- Color-Coded Translucent Visualization:
  * Green: Upper Zones (Right Upper, Left Upper)
  * Yellow: Middle Zones (Right Middle, Left Middle)
  * Red: Lower Zones (Right Lower, Left Lower)
  * Purple: Retrocardiac Analysis ROI
  * Blue: Complete Lung Mask Boundaries
  * White/Gray: Heart / Mediastinum Contour
"""

import cv2
import numpy as np
from typing import Dict, Any, List, Optional
from utils.image_utils import image_to_base64

ZONE_METADATA = {
    "right_upper": {
        "id": "right_upper",
        "name": "Right Upper Zone",
        "short_name": "R. Upper",
        "lung": "Right",
        "tier": "Upper (0 - 33%)",
        "color_bgr": (40, 200, 60),     # Clinical Green
        "color_hex": "#28C83C"
    },
    "right_middle": {
        "id": "right_middle",
        "name": "Right Middle Zone",
        "short_name": "R. Middle",
        "lung": "Right",
        "tier": "Middle (33 - 66%)",
        "color_bgr": (30, 210, 240),    # Clinical Yellow/Amber
        "color_hex": "#F0D21E"
    },
    "right_lower": {
        "id": "right_lower",
        "name": "Right Lower Zone",
        "short_name": "R. Lower",
        "lung": "Right",
        "tier": "Lower (66 - 100%)",
        "color_bgr": (50, 50, 230),     # Clinical Red/Coral
        "color_hex": "#E63232"
    },
    "left_upper": {
        "id": "left_upper",
        "name": "Left Upper Zone",
        "short_name": "L. Upper",
        "lung": "Left",
        "tier": "Upper (0 - 33%)",
        "color_bgr": (40, 200, 60),     # Clinical Green
        "color_hex": "#28C83C"
    },
    "left_middle": {
        "id": "left_middle",
        "name": "Left Middle Zone",
        "short_name": "L. Middle",
        "lung": "Left",
        "tier": "Middle (33 - 66%)",
        "color_bgr": (30, 210, 240),    # Clinical Yellow/Amber
        "color_hex": "#F0D21E"
    },
    "left_lower": {
        "id": "left_lower",
        "name": "Left Lower Zone",
        "short_name": "L. Lower",
        "lung": "Left",
        "tier": "Lower (66 - 100%)",
        "color_bgr": (50, 50, 230),     # Clinical Red/Coral
        "color_hex": "#E63232"
    },
    "retrocardiac": {
        "id": "retrocardiac",
        "name": "Retrocardiac Analysis ROI",
        "short_name": "Retrocardiac",
        "lung": "Left",
        "tier": "Medial / Basal",
        "color_bgr": (200, 50, 180),    # Clinical Purple
        "color_hex": "#B432C8"
    }
}


def divide_six_anatomical_zones(
    enhanced_gray: np.ndarray,
    original_bgr: np.ndarray,
    right_lung_mask: np.ndarray,
    left_lung_mask: np.ndarray,
    heart_mask: Optional[np.ndarray] = None,
    retrocardiac_roi: Optional[np.ndarray] = None
) -> Dict[str, Any]:
    """
    Partitions each lung into 3 vertical tiers strictly by intersecting vertical bands
    with the actual curved lung mask, plus includes the specialized retrocardiac ROI.
    """
    h, w = enhanced_gray.shape
    zones_dict: Dict[str, Any] = {}

    def extract_lung_subzones(lung_mask: np.ndarray, lung_side: str) -> Dict[str, Dict[str, Any]]:
        results = {}
        y_idx, x_idx = np.where(lung_mask > 0)

        if len(y_idx) == 0:
            # Fallback bounds inside valid hemithorax
            y_min, y_max = int(h * 0.15), int(h * 0.85)
            x_min = int(w * 0.10) if lung_side == "right" else int(w * 0.52)
            x_max = int(w * 0.48) if lung_side == "right" else int(w * 0.90)
        else:
            y_min, y_max = int(np.min(y_idx)), int(np.max(y_idx))
            x_min, x_max = int(np.min(x_idx)), int(np.max(x_idx))

        lung_height = max(y_max - y_min, 1)

        # 33.3% and 66.6% vertical division cutoffs based strictly on this lung's vertical span
        y_div1 = y_min + int(lung_height * 0.3333)
        y_div2 = y_min + int(lung_height * 0.6666)

        zone_ranges = {
            f"{lung_side}_upper": (y_min, y_div1),
            f"{lung_side}_middle": (y_div1, y_div2),
            f"{lung_side}_lower": (y_div2, y_max)
        }

        for zone_key, (z_ymin, z_ymax) in zone_ranges.items():
            # Intersect vertical slice strictly with the lung mask
            zone_mask = np.zeros((h, w), dtype=np.uint8)
            zone_mask[z_ymin:z_ymax, :] = lung_mask[z_ymin:z_ymax, :]

            valid_count = int(np.sum(zone_mask > 0))

            zy, zx = np.where(zone_mask > 0)
            if len(zy) > 0:
                cb_ymin, cb_ymax = int(np.min(zy)), int(np.max(zy))
                cb_xmin, cb_xmax = int(np.min(zx)), int(np.max(zx))
            else:
                cb_ymin, cb_ymax = max(0, z_ymin), min(h, z_ymax)
                cb_xmin, cb_xmax = max(0, x_min), min(w, x_max)

            # Crop bounds with padding
            pad = 6
            c_ymin = max(0, cb_ymin - pad)
            c_ymax = min(h, cb_ymax + pad)
            c_xmin = max(0, cb_xmin - pad)
            c_xmax = min(w, cb_xmax + pad)

            cropped_gray = enhanced_gray[c_ymin:c_ymax, c_xmin:c_xmax]
            cropped_mask = zone_mask[c_ymin:c_ymax, c_xmin:c_xmax]
            cropped_bgr = original_bgr[c_ymin:c_ymax, c_xmin:c_xmax]

            meta = ZONE_METADATA[zone_key]

            results[zone_key] = {
                "id": zone_key,
                "name": meta["name"],
                "short_name": meta["short_name"],
                "lung": meta["lung"],
                "tier": meta["tier"],
                "color_hex": meta["color_hex"],
                "color_bgr": meta["color_bgr"],
                "y_range": (z_ymin, z_ymax),
                "crop_bbox": (c_xmin, c_ymin, c_xmax - c_xmin, c_ymax - c_ymin),
                "mask": zone_mask,
                "valid_pixels": valid_count,
                "cropped_gray": cropped_gray,
                "cropped_mask": cropped_mask,
                "cropped_bgr": cropped_bgr
            }

        return results

    # Extract Right and Left Lung subzones
    right_subzones = extract_lung_subzones(right_lung_mask, "right")
    left_subzones = extract_lung_subzones(left_lung_mask, "left")

    zones_dict.update(right_subzones)
    zones_dict.update(left_subzones)

    # Add Retrocardiac Analysis ROI
    if retrocardiac_roi is not None and np.sum(retrocardiac_roi > 0) > 0:
        rc_mask = retrocardiac_roi.copy()
        rc_y, rc_x = np.where(rc_mask > 0)
        if len(rc_y) > 0:
            rc_ymin, rc_ymax = int(np.min(rc_y)), int(np.max(rc_y))
            rc_xmin, rc_xmax = int(np.min(rc_x)), int(np.max(rc_x))
        else:
            rc_ymin, rc_ymax = int(h * 0.5), int(h * 0.8)
            rc_xmin, rc_xmax = int(w * 0.5), int(w * 0.7)

        pad = 6
        c_ymin = max(0, rc_ymin - pad)
        c_ymax = min(h, rc_ymax + pad)
        c_xmin = max(0, rc_xmin - pad)
        c_xmax = min(w, rc_xmax + pad)

        meta = ZONE_METADATA["retrocardiac"]
        zones_dict["retrocardiac"] = {
            "id": "retrocardiac",
            "name": meta["name"],
            "short_name": meta["short_name"],
            "lung": meta["lung"],
            "tier": meta["tier"],
            "color_hex": meta["color_hex"],
            "color_bgr": meta["color_bgr"],
            "y_range": (rc_ymin, rc_ymax),
            "crop_bbox": (c_xmin, c_ymin, c_xmax - c_xmin, c_ymax - c_ymin),
            "mask": rc_mask,
            "valid_pixels": int(np.sum(rc_mask > 0)),
            "cropped_gray": enhanced_gray[c_ymin:c_ymax, c_xmin:c_xmax],
            "cropped_mask": rc_mask[c_ymin:c_ymax, c_xmin:c_xmax],
            "cropped_bgr": original_bgr[c_ymin:c_ymax, c_xmin:c_xmax]
        }

    # =========================================================================
    # MULTI-COLOR MEDICAL OVERLAY COMPOSITE
    # =========================================================================
    # Green = Upper, Yellow = Middle, Red = Lower, Purple = Retrocardiac
    # Blue = Complete Lung Boundaries, White/Gray = Heart
    vis_bgr = original_bgr.copy()
    zone_tint_layer = np.zeros_like(original_bgr)

    for zone_key in ["right_upper", "left_upper", "right_middle", "left_middle", "right_lower", "left_lower"]:
        z_data = zones_dict[zone_key]
        z_mask = z_data["mask"]
        z_color = z_data["color_bgr"]
        zone_tint_layer[z_mask > 0] = z_color

    # Apply Retrocardiac purple highlight if present
    if "retrocardiac" in zones_dict:
        rc_mask = zones_dict["retrocardiac"]["mask"]
        zone_tint_layer[rc_mask > 0] = ZONE_METADATA["retrocardiac"]["color_bgr"]

    # Blend translucent zone tint onto original radiograph
    vis_bgr = cv2.addWeighted(vis_bgr, 0.72, zone_tint_layer, 0.28, 0)

    # Draw Blue contours around complete right and left lung masks
    cnts_r, _ = cv2.findContours(right_lung_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    cnts_l, _ = cv2.findContours(left_lung_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    for c in cnts_r + cnts_l:
        if cv2.contourArea(c) > (h * w * 0.01):
            cv2.drawContours(vis_bgr, [c], -1, (255, 130, 0), 2, cv2.LINE_AA) # Blue

    # Draw White/Gray contour around Heart / Mediastinum
    if heart_mask is not None and np.sum(heart_mask > 0) > 0:
        cnts_h, _ = cv2.findContours(heart_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        for c in cnts_h:
            if cv2.contourArea(c) > (h * w * 0.01):
                cv2.drawContours(vis_bgr, [c], -1, (235, 235, 235), 2, cv2.LINE_AA)

    # Draw individual zone boundaries
    for zone_key, z_data in zones_dict.items():
        if zone_key == "retrocardiac":
            continue
        z_cnts, _ = cv2.findContours(z_data["mask"], cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        for c in z_cnts:
            if cv2.contourArea(c) > (h * w * 0.005):
                cv2.drawContours(vis_bgr, [c], -1, z_data["color_bgr"], 1, cv2.LINE_AA)

    # Draw anatomical zone labels
    for zone_key, z_data in zones_dict.items():
        z_mask = z_data["mask"]
        zy, zx = np.where(z_mask > 0)
        if len(zy) > 0:
            cx, cy = int(np.mean(zx)), int(np.mean(zy))
            lbl = z_data["short_name"]
            # Dark backing for readability
            (tw, th), _ = cv2.getTextSize(lbl, cv2.FONT_HERSHEY_SIMPLEX, 0.42, 1)
            cv2.rectangle(vis_bgr, (cx - tw // 2 - 3, cy - th - 3), (cx + tw // 2 + 3, cy + 3), (20, 20, 20), -1)
            cv2.putText(vis_bgr, lbl, (cx - tw // 2, cy), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (255, 255, 255), 1, cv2.LINE_AA)

    return {
        "zones": zones_dict,
        "visualization_bgr": vis_bgr,
        "visualization_b64": image_to_base64(vis_bgr)
    }
