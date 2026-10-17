import os
import sys
import json
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, confusion_matrix, classification_report
)
from tensorflow.keras.preprocessing.image import ImageDataGenerator # type: ignore
import config
import predict_ml

def evaluate():
    config.ensure_dirs()
    _, _, test_dir = config.get_dataset_paths()
    
    print("=" * 60)
    print("EVALUATING TRAINED ML MODEL ON UNTOUCHED TEST SET")
    print("=" * 60)
    print(f"Test Directory : {test_dir}")
    print(f"Model Path     : {config.MODEL_PATH}")
    print("-" * 60)
    
    if not os.path.exists(test_dir):
        raise FileNotFoundError(f"Test directory not found: {test_dir}")
        
    test_datagen = ImageDataGenerator(rescale=1.0 / 255.0)
    test_gen = test_datagen.flow_from_directory(
        test_dir,
        target_size=config.IMAGE_SIZE,
        batch_size=config.BATCH_SIZE,
        class_mode='binary',
        shuffle=False
    )
    
    print(f"Class mapping: {test_gen.class_indices}")
    model = predict_ml.load_model_cached()
    
    # Generate predictions
    print("\nRunning inference on test dataset...")
    raw_probs = model.predict(test_gen, verbose=1).flatten()
    y_pred = (raw_probs >= 0.5).astype(int)
    y_true = test_gen.classes
    
    # Calculate metrics
    acc = float(accuracy_score(y_true, y_pred))
    prec = float(precision_score(y_true, y_pred, zero_division=0))
    rec = float(recall_score(y_true, y_pred, zero_division=0))
    f1 = float(f1_score(y_true, y_pred, zero_division=0))
    roc = float(roc_auc_score(y_true, raw_probs))
    
    cm = confusion_matrix(y_true, y_pred)
    tn, fp, fn, tp = int(cm[0, 0]), int(cm[0, 1]), int(cm[1, 0]), int(cm[1, 1])
    spec = float(tn / (tn + fp)) if (tn + fp) > 0 else 0.0
    sensitivity = float(tp / (tp + fn)) if (tp + fn) > 0 else 0.0
    
    metrics = {
        "accuracy": round(acc, 4),
        "precision": round(prec, 4),
        "recall": round(rec, 4),
        "f1": round(f1, 4),
        "roc_auc": round(roc, 4),
        "sensitivity": round(sensitivity, 4),
        "specificity": round(spec, 4),
        "confusion_matrix": {
            "true_negative": tn,
            "false_positive": fp,
            "false_negative": fn,
            "true_positive": tp
        },
        "total_test_samples": len(y_true),
        "test_normal_count": int(np.sum(y_true == 0)),
        "test_pneumonia_count": int(np.sum(y_true == 1))
    }
    
    print("\n" + "=" * 60)
    print("FINAL TEST SET EVALUATION METRICS")
    print("=" * 60)
    print(f"Total Test Images : {len(y_true)}")
    print(f"Accuracy          : {acc * 100:.2f}%")
    print(f"Precision         : {prec * 100:.2f}%")
    print(f"Recall (Sens.)    : {rec * 100:.2f}%")
    print(f"Specificity       : {spec * 100:.2f}%")
    print(f"F1 Score          : {f1 * 100:.2f}%")
    print(f"ROC-AUC Score     : {roc * 100:.2f}%")
    print("-" * 60)
    print("Confusion Matrix:")
    print(f"  True Negative (Normal correctly identified)       : {tn}")
    print(f"  False Positive (Normal classified as Pneumonia)   : {fp}")
    print(f"  False Negative (Pneumonia classified as Normal)   : {fn}")
    print(f"  True Positive (Pneumonia correctly identified)    : {tp}")
    print("=" * 60)
    
    # Save metrics JSON
    metrics_path = os.path.join(config.RESULTS_DIR, 'ml_metrics.json')
    with open(metrics_path, 'w') as f:
        json.dump(metrics, f, indent=4)
    print(f"Saved metrics to: {metrics_path}")
    
    # Save classification report
    report = classification_report(y_true, y_pred, target_names=['NORMAL', 'PNEUMONIA'], output_dict=True)
    report_path = os.path.join(config.RESULTS_DIR, 'classification_report.json')
    with open(report_path, 'w') as f:
        json.dump(report, f, indent=4)
        
    # Generate and save confusion matrix plot
    plt.figure(figsize=(6, 5))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues',
                xticklabels=['NORMAL (0)', 'PNEUMONIA (1)'],
                yticklabels=['NORMAL (0)', 'PNEUMONIA (1)'])
    plt.title(f"DenseNet-121 Test Confusion Matrix\nAccuracy: {acc*100:.1f}%")
    plt.ylabel('Ground Truth')
    plt.xlabel('Predicted Label')
    plt.tight_layout()
    cm_path = os.path.join(config.RESULTS_DIR, 'ml_confusion_matrix.png')
    plt.savefig(cm_path, dpi=150)
    plt.close()
    print(f"Saved confusion matrix plot to: {cm_path}")
    
    return metrics

if __name__ == '__main__':
    evaluate()
