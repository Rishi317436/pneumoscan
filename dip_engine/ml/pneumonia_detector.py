"""
Classical Machine Learning Pneumonia Detector for PneumoScan.

Uses 7-Region Texture Characterization (Radiomics + Fractal Dimension + Superpixel Texture)
and Pretrained Classical Classifiers (Random Forest, SVM, KNN) with SMOTE balancing.
"""

import os
import cv2
import numpy as np
import joblib
from typing import Dict, Any, Optional

from ml.lung_segmentation import MLLungSegmenter
from ml.zone_division import divide_seven_anatomical_regions
from ml.feature_extraction import extract_seven_region_features


class PneumoniaDetector:
    """
    Paper-inspired Classical Machine Learning Pneumonia Detector.
    Classifies chest radiographs using a 175-dimensional regional feature vector.
    """

    DEFAULT_PIPELINE_PATHS = [
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "models", "pneumonia_classical_pipeline.joblib")),
        "D:/PneumoniaML/models/pneumonia_classical_pipeline.joblib",
        "/mnt/d/PneumoniaML/models/pneumonia_classical_pipeline.joblib",
    ]

    THRESHOLD = 0.50

    CLASS_NAMES = {
        0: "NORMAL",
        1: "PNEUMONIA"
    }

    def __init__(self, pipeline_path: Optional[str] = None):
        self.pipeline = None
        self.model = None
        self.scaler = None
        self.feature_names = []
        self.classifier_name = "Classical ML (Random Forest / SVM / KNN)"
        self.metrics = {}
        self.top_features = []

        target_paths = [pipeline_path] if pipeline_path else self.DEFAULT_PIPELINE_PATHS

        for p in target_paths:
            if p and os.path.exists(p):
                try:
                    print(f"Loading Classical ML Pipeline from {p}...")
                    self.pipeline = joblib.load(p)
                    self.model = self.pipeline.get("model")
                    self.scaler = self.pipeline.get("scaler")
                    self.feature_names = self.pipeline.get("feature_names", [])
                    self.classifier_name = self.pipeline.get("classifier_name", "Random Forest Classifier")
                    self.metrics = self.pipeline.get("best_metrics", {})
                    self.top_features = self.pipeline.get("top_features", [])
                    print(f"Classical ML Pipeline ({self.classifier_name}) loaded successfully.")
                    break
                except Exception as e:
                    print(f"Warning: Could not load pipeline from {p}: {e}")

        if self.model is None:
            print("Notice: Classical ML pipeline artifact not yet found or loaded. Running with heuristic fallback.")

    def predict_from_features(self, feature_vector: np.ndarray) -> Dict[str, Any]:
        """
        Runs classical classifier inference on a 175-dimensional feature vector.
        """
        if self.model is not None and self.scaler is not None:
            # Clean and reshape vector
            clean_vec = np.nan_to_num(feature_vector, nan=0.0, posinf=0.0, neginf=0.0)
            if clean_vec.ndim == 1:
                clean_vec = clean_vec.reshape(1, -1)

            # Strict scaling using fitted scaler
            scaled_vec = self.scaler.transform(clean_vec)

            # Predict probabilities
            if hasattr(self.model, "predict_proba"):
                probs = self.model.predict_proba(scaled_vec)[0]
                prob_pneumonia = float(probs[1]) if len(probs) > 1 else float(probs[0])
                prob_normal = float(probs[0]) if len(probs) > 1 else float(1.0 - prob_pneumonia)
            else:
                pred = int(self.model.predict(scaled_vec)[0])
                prob_pneumonia = 0.90 if pred == 1 else 0.10
                prob_normal = 1.0 - prob_pneumonia

            prediction_idx = 1 if prob_pneumonia >= self.THRESHOLD else 0
            class_name = self.CLASS_NAMES[prediction_idx]

            return {
                "prediction": class_name,
                "probability": prob_pneumonia,
                "probability_percent": prob_pneumonia * 100.0,
                "prob_pneumonia": prob_pneumonia,
                "prob_normal": prob_normal,
                "threshold": self.THRESHOLD,
                "classifier_name": self.classifier_name,
                "metrics": self.metrics,
                "top_features": self.top_features[:5]
            }

        else:
            # Fallback heuristic if pipeline not yet serialized
            mean_intensity = float(np.mean(feature_vector)) if len(feature_vector) > 0 else 128.0
            prob = 1.0 / (1.0 + np.exp(-((mean_intensity - 120.0) / 25.0)))
            prob = float(np.clip(prob, 0.05, 0.95))
            pred = 1 if prob >= self.THRESHOLD else 0
            return {
                "prediction": self.CLASS_NAMES[pred],
                "probability": prob,
                "probability_percent": prob * 100.0,
                "prob_pneumonia": prob,
                "prob_normal": 1.0 - prob,
                "threshold": self.THRESHOLD,
                "classifier_name": "Heuristic Fallback",
                "metrics": {},
                "top_features": []
            }

    def predict(self, image_path: str) -> Dict[str, Any]:
        """
        End-to-end convenience method: loads image, runs U-Net segmentation, 7-region division,
        feature extraction, and classical ML classification.
        """
        if not os.path.isfile(image_path):
            raise FileNotFoundError(f"Image not found: {image_path}")

        bgr = cv2.imread(image_path)
        if bgr is None:
            raise ValueError(f"Could not decode image at {image_path}")

        gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(gray)

        segmenter = MLLungSegmenter()
        seg_res = segmenter.segment_lungs(enhanced)

        zone_res = divide_seven_anatomical_regions(
            enhanced_gray=enhanced,
            original_bgr=bgr,
            right_lung_mask=seg_res["right_lung_mask"],
            left_lung_mask=seg_res["left_lung_mask"],
            heart_mask=seg_res.get("heart_mask"),
            retrocardiac_roi=seg_res.get("retrocardiac_roi")
        )

        _, vec, _ = extract_seven_region_features(zone_res["zones"])
        return self.predict_from_features(vec)
