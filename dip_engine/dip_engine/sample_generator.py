"""
Synthetic Chest Radiograph Generator for Testing & Demonstration.
Generates realistic normal and pneumonia-like chest radiograph phantom arrays.
"""

import cv2
import numpy as np

def generate_chest_xray_phantom(is_pneumonia: bool = False) -> bytes:
    """
    Generates a 512x512 synthetic chest X-ray phantom for demonstration and testing.
    - Normal phantom: Clear aerated bilateral lung fields with realistic ribs, spine, and smooth cardiac silhouette.
    - Pneumonia phantom: Features dense airspace consolidation with mottled texture and air bronchogram patterns.
    """
    h, w = 512, 512
    # Base background (Dark outer space)
    img = np.full((h, w), 18.0, dtype=np.float32)

    # Torso boundary ellipse
    y, x = np.ogrid[:h, :w]
    torso_mask = ((x - 256) ** 2) / (205 ** 2) + ((y - 250) ** 2) / (225 ** 2) <= 1.0
    img[torso_mask] = 145.0

    # Lungs (Radiolucent darker cavities)
    # Right Hemithorax (Viewer's left)
    r_lung = ((x - 170) ** 2) / (72 ** 2) + ((y - 240) ** 2) / (135 ** 2) <= 1.0
    # Left Hemithorax (Viewer's right)
    l_lung = ((x - 342) ** 2) / (70 ** 2) + ((y - 240) ** 2) / (132 ** 2) <= 1.0

    # Lung parenchyma baseline (Aerated dark tissue)
    img[r_lung] = 55.0
    img[l_lung] = 58.0

    # Mediastinum & Spine (Central radiopaque column)
    spine_mask = (np.abs(x - 256) < 26) & (y > 40) & (y < 460)
    img[spine_mask] = 195.0

    # Normal Smooth Cardiac Silhouette (Anatomical heart in central/left-lower hemithorax)
    heart_mask = ((x - 290) ** 2) / (65 ** 2) + ((y - 295) ** 2) / (55 ** 2) <= 1.0
    img[heart_mask] = 180.0

    # Rib cage structures
    for rib_y in range(130, 420, 38):
        for center_x in [165, 345]:
            curve = (y - (rib_y + 0.12 * (x - center_x) ** 2 / 100))
            rib_line = (np.abs(curve) < 4) & (np.abs(x - 256) > 28) & (np.abs(x - 256) < 185)
            img[rib_line] += 32.0

    # Interstitial bronchovascular markings
    noise = np.random.normal(0, 4.0, (h, w)).astype(np.float32)
    img[r_lung | l_lung] += noise[r_lung | l_lung]

    # If Pneumonia: add true alveolar consolidation with mottled texture & bronchograms
    if is_pneumonia:
        inf_cx, inf_cy = 165, 305
        dist_from_inf = np.sqrt((x - inf_cx) ** 2 + (y - inf_cy) ** 2)
        inf_patch = np.exp(- (dist_from_inf ** 2) / (2 * (42 ** 2))) * 140.0
        inf_texture = np.random.normal(0, 22.0, (h, w)).astype(np.float32)
        patch_combined = (inf_patch + inf_texture)
        infiltrate_mask = r_lung & (dist_from_inf < 65)
        img[infiltrate_mask] += patch_combined[infiltrate_mask]

    # Clip intensities to standard 8-bit range [0, 255]
    img_uint8 = np.clip(img, 0, 255).astype(np.uint8)
    
    # Gaussian scatter
    blurred = cv2.GaussianBlur(img_uint8, (3, 3), 0)

    # Encode to PNG bytes
    _, encoded = cv2.imencode(".png", blurred)
    return encoded.tobytes()
