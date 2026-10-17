"""
Six-Zone Anatomical Division Module for Chest Radiographs.
Divides segmented right and left hemithoraces into:
- Right Upper Zone (RU)
- Right Middle Zone (RM)
- Right Lower Zone (RL)
- Left Upper Zone (LU)
- Left Middle Zone (LM)
- Left Lower Zone (LL)

Boundaries are computed strictly along the vertical anatomical extent (0-33%, 33-66%, 66-100%)
of each lung independently and restricted to the validated lung mask.
"""

import cv2
import numpy as np
from typing import Dict, Any, List
from dip_engine.utils import image_to_base64

ZONE_METADATA = {
    "right_upper": {
        "id": "right_upper",
        "name": "Right Upper Zone",
        "short_name": "R. Upper",
        "lung": "Right",
        "tier": "Upper (0-33%)",
        "color_bgr": (80, 120, 255),    # Coral / Orange-Red
        "color_hex": "#FF7850"
    },
    "right_middle": {
        "id": "right_middle",
        "name": "Right Middle Zone",
        "short_name": "R. Middle",
        "lung": "Right",
        "tier": "Middle (33-66%)",
        "color_bgr": (50, 180, 245),    # Amber / Gold
        "color_hex": "#F5B432"
    },
    "right_lower": {
        "id": "right_lower",
        "name": "Right Lower Zone",
        "short_name": "R. Lower",
        "lung": "Right",
        "tier": "Lower (66-100%)",
        "color_bgr": (120, 210, 70),    # Emerald / Green
        "color_hex": "#46D278"
    },
    "left_upper": {
        "id": "left_upper",
        "name": "Left Upper Zone",
        "short_name": "L. Upper",
        "lung": "Left",
        "tier": "Upper (0-33%)",
        "color_bgr": (248, 189, 56),    # Sky Blue
        "color_hex": "#38BDF8"
    },
    "left_middle": {
        "id": "left_middle",
        "name": "Left Middle Zone",
        "short_name": "L. Middle",
        "lung": "Left",
        "tier": "Middle (33-66%)",
        "color_bgr": (248, 140, 129),   # Indigo
        "color_hex": "#818CF8"
    },
    "left_lower": {
        "id": "left_lower",
        "name": "Left Lower Zone",
        "short_name": "L. Lower",
        "lung": "Left",
        "tier": "Lower (66-100%)",
        "color_bgr": (239, 70, 217),    # Purple / Magenta
        "color_hex": "#D946EF"
    }
}

def divide_into_six_zones(
    enhanced_gray: np.ndarray,
    original_bgr: np.ndarray,
    right_lung_mask: np.ndarray,
    left_lung_mask: np.ndarray
) -> Dict[str, Any]:
    """
    Splits the anatomical lung masks into 6 zones based on individual vertical spans.
    Produces cropped zone images, masks, and a high-resolution 6-zone composite visualization.
    """
    h, w = enhanced_gray.shape
    zones_dict: Dict[str, Any] = {}

    def extract_lung_zones(lung_mask: np.ndarray, lung_side: str) -> Dict[str, Dict[str, Any]]:
        results = {}
        y_indices, x_indices = np.where(lung_mask > 0)
        
        if len(y_indices) == 0:
            y_min, y_max = int(h * 0.15), int(h * 0.85)
            x_min = int(w * 0.15) if lung_side == "right" else int(w * 0.52)
            x_max = int(w * 0.48) if lung_side == "right" else int(w * 0.85)
        else:
            y_min, y_max = int(np.min(y_indices)), int(np.max(y_indices))
            x_min, x_max = int(np.min(x_indices)), int(np.max(x_indices))

        lung_height = max(y_max - y_min, 1)
        
        # 33% and 66% boundaries
        y_div1 = y_min + int(lung_height * 0.33)
        y_div2 = y_min + int(lung_height * 0.66)

        zone_bounds = {
            f"{lung_side}_upper": (y_min, y_div1),
            f"{lung_side}_middle": (y_div1, y_div2),
            f"{lung_side}_lower": (y_div2, y_max)
        }

        for zone_key, (z_ymin, z_ymax) in zone_bounds.items():
            # Create zone mask restricted to valid lung pixels
            zone_mask = np.zeros((h, w), dtype=np.uint8)
            zone_mask[z_ymin:z_ymax, :] = lung_mask[z_ymin:z_ymax, :]

            # Valid lung pixel coordinates
            valid_pixels_count = int(np.sum(zone_mask > 0))
            
            # Crop bounding box
            zy_idx, zx_idx = np.where(zone_mask > 0)
            if len(zy_idx) > 0:
                cb_ymin, cb_ymax = int(np.min(zy_idx)), int(np.max(zy_idx))
                cb_xmin, cb_xmax = int(np.min(zx_idx)), int(np.max(zx_idx))
            else:
                cb_ymin, cb_ymax = max(0, z_ymin), min(h, z_ymax)
                cb_xmin, cb_xmax = max(0, x_min), min(w, x_max)

            # Add small padding to crop for context
            pad = 6
            c_ymin = max(0, cb_ymin - pad)
            c_ymax = min(h, cb_ymax + pad)
            c_xmin = max(0, cb_xmin - pad)
            c_xmax = min(w, cb_xmax + pad)

            cropped_gray = enhanced_gray[c_ymin:c_ymax, c_xmin:c_xmax]
            cropped_mask = zone_mask[c_ymin:c_ymax, c_xmin:c_xmax]
            cropped_bgr = original_bgr[c_ymin:c_ymax, c_xmin:c_xmax]
            
            # Masked crop (black outside lung)
            masked_crop_gray = cv2.bitwise_and(cropped_gray, cropped_gray, mask=cropped_mask)
            masked_crop_bgr = cv2.bitwise_and(cropped_bgr, cropped_bgr, mask=cropped_mask)

            meta = ZONE_METADATA[zone_key]

            results[zone_key] = {
                "id": zone_key,
                "name": meta["name"],
                "short_name": meta["short_name"],
                "lung": meta["lung"],
                "tier": meta["tier"],
                "color_hex": meta["color_hex"],
                "y_range": [z_ymin, z_ymax],
                "bbox": [c_xmin, c_ymin, c_xmax - c_xmin, c_ymax - c_ymin],
                "mask": zone_mask,
                "valid_pixels": valid_pixels_count,
                "cropped_gray": cropped_gray,
                "cropped_mask": cropped_mask,
                "cropped_bgr": cropped_bgr,
                "masked_crop_bgr": masked_crop_bgr,
                "images": {
                    "crop": image_to_base64(cropped_bgr),
                    "masked_crop": image_to_base64(masked_crop_bgr)
                }
            }

        return results

    right_zones = extract_lung_zones(right_lung_mask, "right")
    left_zones = extract_lung_zones(left_lung_mask, "left")
    zones_dict.update(right_zones)
    zones_dict.update(left_zones)

    # ----------------------------------------------------
    # Generate Six-Zone Overlay Image
    # ----------------------------------------------------
    six_zone_viz = original_bgr.copy()
    overlay_tint = np.zeros_like(original_bgr)

    for zone_key, z_data in zones_dict.items():
        z_mask = z_data["mask"]
        color = ZONE_METADATA[zone_key]["color_bgr"]
        
        # Tint region
        overlay_tint[z_mask > 0] = color
        
        # Find zone contour
        cnts, _ = cv2.findContours(z_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        cv2.drawContours(six_zone_viz, cnts, -1, color, 2)

    # Alpha blend tint onto original X-ray
    six_zone_viz = cv2.addWeighted(six_zone_viz, 0.70, overlay_tint, 0.30, 0)

    # Draw clear division lines and anatomical labels
    for zone_key, z_data in zones_dict.items():
        z_mask = z_data["mask"]
        color = ZONE_METADATA[zone_key]["color_bgr"]
        meta = ZONE_METADATA[zone_key]

        # Calculate centroid for label placement
        zy, zx = np.where(z_mask > 0)
        if len(zy) > 0:
            cx, cy = int(np.mean(zx)), int(np.mean(zy))
            
            # Label box background
            label_text = meta["short_name"]
            font = cv2.FONT_HERSHEY_SIMPLEX
            scale = 0.50
            thickness = 1
            (t_w, t_h), baseline = cv2.getTextSize(label_text, font, scale, thickness)
            
            box_x1 = max(4, cx - t_w // 2 - 4)
            box_y1 = max(4, cy - t_h // 2 - 4)
            box_x2 = min(w - 4, box_x1 + t_w + 8)
            box_y2 = min(h - 4, box_y1 + t_h + 8)

            cv2.rectangle(six_zone_viz, (box_x1, box_y1), (box_x2, box_y2), (20, 20, 24), -1)
            cv2.rectangle(six_zone_viz, (box_x1, box_y1), (box_x2, box_y2), color, 1)
            cv2.putText(
                six_zone_viz,
                label_text,
                (box_x1 + 4, box_y1 + t_h + 2),
                font,
                scale,
                (255, 255, 255),
                thickness,
                cv2.LINE_AA
            )

    return {
        "zones": zones_dict,
        "visualization_bgr": six_zone_viz,
        "visualization_b64": image_to_base64(six_zone_viz)
    }
