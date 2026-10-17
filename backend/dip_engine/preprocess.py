import cv2
import numpy as np
import os
import config

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

def resize_image(img, size=config.IMAGE_SIZE):
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
