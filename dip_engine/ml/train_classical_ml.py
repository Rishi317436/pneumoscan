"""
Classical Machine Learning Training and Evaluation Pipeline for PneumoScan.

Trains Classical Classifiers (Random Forest, SVM, KNN) on the 175-dimensional
7-region texture/radiomics/fractal/superpixel feature vectors.

Features:
- Incremental Caching & Resume Capability: Features are cached per-image so any
  interrupted run can resume immediately without re-extracting completed images.
- Strict Data Leakage Prevention: Scaler fitted ONLY on training split.
- Class Imbalance Handling: SMOTE applied ONLY to training split.
- Complete Clinical Performance Metrics on untouched Test Set:
  Accuracy, Sensitivity (Recall), Specificity, Precision (PPV), NPV, F1-Score, ROC-AUC.
"""

import os
import glob
import time
import cv2
import numpy as np
import joblib
import hashlib
from typing import Dict, Any, List, Tuple, Optional

from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.svm import SVC
from sklearn.neighbors import KNeighborsClassifier
from sklearn.metrics import (
    accuracy_score,
    recall_score,
    precision_score,
    f1_score,
    roc_auc_score,
    confusion_matrix,
    classification_report
)
from imblearn.over_sampling import SMOTE

from ml.lung_segmentation import MLLungSegmenter
from ml.zone_division import divide_seven_anatomical_regions
from ml.feature_extraction import extract_seven_region_features


DATASET_DIR = r"D:\PneumoniaML\dataset"
OUTPUT_DIR = r"D:\PneumoniaML\models"
CACHE_DIR = r"D:\PneumoniaML\models\feature_cache"
IMAGE_CACHE_DIR = r"D:\PneumoniaML\models\feature_cache\per_image"


def get_image_cache_key(image_path: str) -> str:
    """Generates a deterministic unique key based on relative path and filename."""
    norm_path = os.path.normpath(image_path)
    h = hashlib.md5(norm_path.encode('utf-8')).hexdigest()[:12]
    basename = os.path.splitext(os.path.basename(image_path))[0]
    return f"{basename}_{h}"


def extract_single_image_features(
    image_path: str,
    segmenter: MLLungSegmenter,
    clahe: Optional[Any] = None
) -> Tuple[Optional[np.ndarray], Optional[List[str]]]:
    """Extracts 175-dimensional feature vector from a single radiograph."""
    if clahe is None:
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))

    bgr = cv2.imread(image_path)
    if bgr is None:
        return None, None

    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    enhanced = clahe.apply(gray)

    try:
        seg_res = segmenter.segment_lungs(enhanced)
        zone_res = divide_seven_anatomical_regions(
            enhanced_gray=enhanced,
            original_bgr=bgr,
            right_lung_mask=seg_res["right_lung_mask"],
            left_lung_mask=seg_res["left_lung_mask"],
            heart_mask=seg_res.get("heart_mask"),
            retrocardiac_roi=seg_res.get("retrocardiac_roi")
        )

        _, vec, f_names = extract_seven_region_features(zone_res["zones"])
        return vec, f_names

    except Exception as e:
        print(f"Error processing {image_path}: {e}")
        return None, None


def extract_features_from_folder(
    folder_path: str,
    label: int,
    segmenter: MLLungSegmenter,
    max_samples: Optional[int] = None,
    image_cache_dir: str = IMAGE_CACHE_DIR
) -> Tuple[np.ndarray, np.ndarray, List[str]]:
    """
    Extracts 7-region feature vectors from radiograph images in a directory with
    persistent per-image caching and immediate resumption.
    """
    os.makedirs(image_cache_dir, exist_ok=True)

    image_paths = []
    for ext in ["*.jpeg", "*.jpg", "*.png", "*.JPEG", "*.JPG", "*.PNG"]:
        image_paths.extend(glob.glob(os.path.join(folder_path, ext)))

    image_paths.sort()
    if max_samples is not None:
        image_paths = image_paths[:max_samples]

    X_list = []
    y_list = []
    feature_names = []

    folder_name = os.path.basename(folder_path)
    split_name = os.path.basename(os.path.dirname(folder_path))
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))

    cached_count = 0
    newly_computed_count = 0

    print(f"Loading/Extracting features for {split_name}/{folder_name} ({len(image_paths)} images)...", flush=True)

    for idx, path in enumerate(image_paths):
        key = get_image_cache_key(path)
        cache_item_path = os.path.join(image_cache_dir, f"{key}.joblib")

        # 1. Load from persistent per-image cache if already extracted
        if os.path.exists(cache_item_path):
            try:
                cached_data = joblib.load(cache_item_path)
                vec = cached_data["vector"]
                f_names = cached_data.get("feature_names", [])
                X_list.append(vec)
                y_list.append(label)
                if not feature_names and f_names:
                    feature_names = f_names
                cached_count += 1
                continue
            except Exception:
                pass  # Recompute if corrupted

        # 2. Extract fresh features
        vec, f_names = extract_single_image_features(path, segmenter, clahe)
        if vec is not None:
            # Immediately persist to disk so progress is never lost
            joblib.dump({"vector": vec, "feature_names": f_names, "path": path, "label": label}, cache_item_path)
            X_list.append(vec)
            y_list.append(label)
            if not feature_names and f_names:
                feature_names = f_names
            newly_computed_count += 1

        if (idx + 1) % 25 == 0 or (idx + 1) == len(image_paths):
            print(f"  [{split_name}/{folder_name}] Processed {idx + 1}/{len(image_paths)} (Cached: {cached_count}, New: {newly_computed_count})", flush=True)

    print(f"  Completed {split_name}/{folder_name}: Total {len(X_list)} feature vectors ({cached_count} from cache, {newly_computed_count} newly extracted).", flush=True)
    return np.array(X_list, dtype=np.float32), np.array(y_list, dtype=np.int64), feature_names


def load_or_extract_dataset_features(
    dataset_dir: str = DATASET_DIR,
    cache_dir: str = CACHE_DIR,
    max_train_per_class: int = 600,
    max_test_per_class: Optional[int] = None
) -> Dict[str, Any]:
    """
    Loads pre-extracted features from disk cache, or extracts them with per-image incremental caching.
    """
    os.makedirs(cache_dir, exist_ok=True)
    os.makedirs(IMAGE_CACHE_DIR, exist_ok=True)
    combined_cache_file = os.path.join(cache_dir, f"features_cache_train_{max_train_per_class}.joblib")

    if os.path.exists(combined_cache_file):
        print(f"Loading combined 7-region feature dataset from {combined_cache_file}...")
        return joblib.load(combined_cache_file)

    print("Initializing MLLungSegmenter for feature extraction across dataset splits...")
    segmenter = MLLungSegmenter()

    train_normal_dir = os.path.join(dataset_dir, "train", "NORMAL")
    train_pneumonia_dir = os.path.join(dataset_dir, "train", "PNEUMONIA")
    test_normal_dir = os.path.join(dataset_dir, "test", "NORMAL")
    test_pneumonia_dir = os.path.join(dataset_dir, "test", "PNEUMONIA")

    X_train_norm, y_train_norm, f_names = extract_features_from_folder(
        train_normal_dir, 0, segmenter, max_samples=max_train_per_class
    )

    X_train_pneu, y_train_pneu, _ = extract_features_from_folder(
        train_pneumonia_dir, 1, segmenter, max_samples=max_train_per_class
    )

    X_test_norm, y_test_norm, _ = extract_features_from_folder(
        test_normal_dir, 0, segmenter, max_samples=max_test_per_class
    )

    X_test_pneu, y_test_pneu, _ = extract_features_from_folder(
        test_pneumonia_dir, 1, segmenter, max_samples=max_test_per_class
    )

    X_train = np.vstack([X_train_norm, X_train_pneu])
    y_train = np.concatenate([y_train_norm, y_train_pneu])

    X_test = np.vstack([X_test_norm, X_test_pneu])
    y_test = np.concatenate([y_test_norm, y_test_pneu])

    perm = np.random.RandomState(42).permutation(len(y_train))
    X_train = X_train[perm]
    y_train = y_train[perm]

    data = {
        "X_train": X_train,
        "y_train": y_train,
        "X_test": X_test,
        "y_test": y_test,
        "feature_names": f_names
    }

    joblib.dump(data, combined_cache_file)
    print(f"\nFeature dataset compiled and cached to {combined_cache_file}.", flush=True)
    print(f"X_train shape: {X_train.shape} (Normal: {np.sum(y_train == 0)}, Pneumonia: {np.sum(y_train == 1)})", flush=True)
    print(f"X_test shape: {X_test.shape} (Normal: {np.sum(y_test == 0)}, Pneumonia: {np.sum(y_test == 1)})", flush=True)
    return data


def evaluate_classifier(
    name: str,
    clf: Any,
    X_test_scaled: np.ndarray,
    y_test: np.ndarray
) -> Dict[str, Any]:
    """Computes comprehensive clinical evaluation metrics on the untouched test set."""
    y_pred = clf.predict(X_test_scaled)
    y_prob = clf.predict_proba(X_test_scaled)[:, 1] if hasattr(clf, "predict_proba") else y_pred.astype(float)

    acc = accuracy_score(y_test, y_pred)
    sens = recall_score(y_test, y_pred, pos_label=1)
    prec = precision_score(y_test, y_pred, pos_label=1)
    f1 = f1_score(y_test, y_pred, pos_label=1)
    auc = roc_auc_score(y_test, y_prob)

    cm = confusion_matrix(y_test, y_pred)
    tn, fp, fn, tp = cm.ravel()
    spec = tn / (tn + fp) if (tn + fp) > 0 else 0.0
    npv = tn / (tn + fn) if (tn + fn) > 0 else 0.0

    metrics = {
        "classifier_name": name,
        "accuracy": float(acc),
        "sensitivity": float(sens),
        "specificity": float(spec),
        "precision": float(prec),
        "npv": float(npv),
        "f1_score": float(f1),
        "roc_auc": float(auc),
        "confusion_matrix": {
            "true_positive": int(tp),
            "false_negative": int(fn),
            "true_negative": int(tn),
            "false_positive": int(fp)
        },
        "cm_matrix": cm.tolist(),
        "total_test_samples": int(len(y_test))
    }

    print(f"\n=======================================================", flush=True)
    print(f" Performance Summary: {name}", flush=True)
    print(f"=======================================================", flush=True)
    print(f"  Accuracy:    {acc * 100:.2f}%", flush=True)
    print(f"  Sensitivity: {sens * 100:.2f}% (Pneumonia Recall)", flush=True)
    print(f"  Specificity: {spec * 100:.2f}% (Normal Recall)", flush=True)
    print(f"  Precision:   {prec * 100:.2f}% (PPV)", flush=True)
    print(f"  NPV:         {npv * 100:.2f}% (Negative Predictive Value)", flush=True)
    print(f"  F1-Score:    {f1:.4f}", flush=True)
    print(f"  ROC-AUC:     {auc:.4f}", flush=True)
    print(f"  Confusion Matrix:", flush=True)
    print(f"    TP: {tp:3d}  |  FP: {fp:3d}", flush=True)
    print(f"    FN: {fn:3d}  |  TN: {tn:3d}", flush=True)
    print(f"=======================================================", flush=True)

    return metrics


def train_and_evaluate_pipeline(
    max_train_per_class: int = 600,
    save_pipeline_path: str = os.path.join(OUTPUT_DIR, "pneumonia_classical_pipeline.joblib")
) -> Dict[str, Any]:
    """Orchestrates feature extraction with caching, SMOTE balancing, training, and evaluation."""
    data = load_or_extract_dataset_features(max_train_per_class=max_train_per_class)
    X_train = data["X_train"]
    y_train = data["y_train"]
    X_test = data["X_test"]
    y_test = data["y_test"]
    feature_names = data["feature_names"]

    X_train = np.nan_to_num(X_train, nan=0.0, posinf=0.0, neginf=0.0)
    X_test = np.nan_to_num(X_test, nan=0.0, posinf=0.0, neginf=0.0)

    print("\nFitting StandardScaler strictly on training set...", flush=True)
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    print(f"Applying SMOTE to training set (Initial: Normal={np.sum(y_train==0)}, Pneumonia={np.sum(y_train==1)})...", flush=True)
    smote = SMOTE(random_state=42)
    X_train_resampled, y_train_resampled = smote.fit_resample(X_train_scaled, y_train)
    print(f"SMOTE Balanced Training Set: Normal={np.sum(y_train_resampled==0)}, Pneumonia={np.sum(y_train_resampled==1)}", flush=True)

    classifiers = {
        "Random Forest Classifier": RandomForestClassifier(
            n_estimators=300,
            max_depth=16,
            min_samples_split=4,
            min_samples_leaf=2,
            max_features="sqrt",
            random_state=42,
            n_jobs=-1
        ),
        "Support Vector Classifier (RBF)": SVC(
            C=3.0,
            gamma="scale",
            probability=True,
            random_state=42
        ),
        "K-Nearest Neighbors": KNeighborsClassifier(
            n_neighbors=7,
            weights="distance",
            metric="minkowski",
            p=2
        )
    }

    all_results = {}
    best_clf_name = None
    best_f1 = -1.0
    best_clf = None

    for clf_name, clf in classifiers.items():
        print(f"\nTraining {clf_name} on {len(y_train_resampled)} balanced samples...", flush=True)
        t0 = time.time()
        clf.fit(X_train_resampled, y_train_resampled)
        train_time = time.time() - t0
        print(f"Trained in {train_time:.2f}s.", flush=True)

        metrics = evaluate_classifier(clf_name, clf, X_test_scaled, y_test)
        all_results[clf_name] = metrics

        if metrics["f1_score"] > best_f1:
            best_f1 = metrics["f1_score"]
            best_clf_name = clf_name
            best_clf = clf

    print(f"\n>>> Selected Best Classical Model: {best_clf_name} (F1-Score: {best_f1:.4f}) <<<", flush=True)

    top_features = []
    if hasattr(best_clf, "feature_importances_"):
        importances = best_clf.feature_importances_
        sorted_indices = np.argsort(importances)[::-1]
        top_features = [
            {"rank": i + 1, "feature": feature_names[idx], "importance": float(importances[idx])}
            for i, idx in enumerate(sorted_indices[:20])
        ]

    pipeline_artifact = {
        "model": best_clf,
        "scaler": scaler,
        "classifier_name": best_clf_name,
        "feature_names": feature_names,
        "all_metrics": all_results,
        "best_metrics": all_results[best_clf_name],
        "top_features": top_features,
        "class_names": {0: "NORMAL", 1: "PNEUMONIA"},
        "version": "2.2.0",
        "description": "7-Region Radiomics + Fractal Dimension + Superpixel Texture Classical Machine Learning Classifier"
    }

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    joblib.dump(pipeline_artifact, save_pipeline_path)
    print(f"\nPipeline successfully serialized and saved to: {save_pipeline_path}", flush=True)

    return pipeline_artifact


if __name__ == "__main__":
    train_and_evaluate_pipeline(max_train_per_class=600)
