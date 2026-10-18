"""
DIP Engine Utilities Package
"""
import os
import sys

from .image_utils import (
    image_to_base64,
    compute_histogram,
    apply_heatmap_overlay,
    safe_normalize,
    sanitize_for_json,
)

normalize_feature = safe_normalize

__all__ = [
    "image_to_base64",
    "compute_histogram",
    "apply_heatmap_overlay",
    "safe_normalize",
    "normalize_feature",
    "sanitize_for_json",
]
