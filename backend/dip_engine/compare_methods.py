import os
import json
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, confusion_matrix
import config
import manual_detection
import predict_ml
import preprocess

def compare():
    config.ensure_dirs()
    _, _, test_dir = config.get_dataset_paths()
    
    print("=" * 60)
    print("RUNNING HIGH-PERFORMANCE MULTI-METHOD BENCHMARK")
    print("=" * 60)
    
    image_paths = []
    y_true = []
    
    for class_name in ['NORMAL', 'PNEUMONIA']:
        d = os.path.join(test_dir, class_name)
        if not os.path.exists(d):
            continue
        label = 1 if class_name == 'PNEUMONIA' else 0
        files = [os.path.join(d, f) for f in os.listdir(d) if f.lower().endswith(('.jpeg', '.jpg', '.png'))]
        for f in files:
            image_paths.append(f)
            y_true.append(label)
            
    if not y_true:
        print("No test data found.")
        return
        
    y_true = np.array(y_true)
    total_images = len(image_paths)
    print(f"Total Test Cohort: {total_images} radiographs (NORMAL: {int(np.sum(y_true==0))}, PNEUMONIA: {int(np.sum(y_true==1))})")
    
    # 1. Run Traditional DIP Method
    print("\n[1/2] Computing Traditional Image-Processing Features...")
    manual_preds = []
    for idx, p in enumerate(image_paths):
        res = manual_detection.detect(p)
        pred_label = 1 if res.get("prediction") == 'PNEUMONIA' else 0
        manual_preds.append(pred_label)
        if (idx + 1) % 150 == 0 or (idx + 1) == total_images:
            print(f"  Processed {idx + 1}/{total_images} images...")
            
    manual_preds = np.array(manual_preds)
    
    # 2. Run Batch ML Model
    print("\n[2/2] Running Deep Learning Model (DenseNet-121) Batch Inference...")
    model = predict_ml.load_model_cached()
    
    # Preprocess all images in memory for batch prediction
    batch_imgs = np.array([preprocess.preprocess_for_ml(p) for p in image_paths], dtype=np.float32)
    ml_probs = model.predict(batch_imgs, batch_size=32, verbose=1).flatten()
    ml_preds = (ml_probs >= 0.5).astype(int)
    
    # Calculate Traditional DIP Metrics
    man_acc = float(accuracy_score(y_true, manual_preds))
    man_prec = float(precision_score(y_true, manual_preds, zero_division=0))
    man_rec = float(recall_score(y_true, manual_preds, zero_division=0))
    man_f1 = float(f1_score(y_true, manual_preds, zero_division=0))
    cm_man = confusion_matrix(y_true, manual_preds)
    man_spec = float(cm_man[0,0]/(cm_man[0,0]+cm_man[0,1])) if (cm_man[0,0]+cm_man[0,1]) > 0 else 0.0
    
    # Calculate ML Deep Learning Metrics
    ml_acc = float(accuracy_score(y_true, ml_preds))
    ml_prec = float(precision_score(y_true, ml_preds, zero_division=0))
    ml_rec = float(recall_score(y_true, ml_preds, zero_division=0))
    ml_f1 = float(f1_score(y_true, ml_preds, zero_division=0))
    try:
        ml_roc = float(roc_auc_score(y_true, ml_probs))
    except Exception:
        ml_roc = ml_acc
    cm_ml = confusion_matrix(y_true, ml_preds)
    ml_spec = float(cm_ml[0,0]/(cm_ml[0,0]+cm_ml[0,1])) if (cm_ml[0,0]+cm_ml[0,1]) > 0 else 0.0
    
    # Agreement Rate
    agreement = float(np.mean(manual_preds == ml_preds))
    
    results = {
        "manual_metrics": {
            "accuracy": round(man_acc, 4),
            "precision": round(man_prec, 4),
            "recall": round(man_rec, 4),
            "f1": round(man_f1, 4),
            "sensitivity": round(man_rec, 4),
            "specificity": round(man_spec, 4),
            "confusion_matrix": {
                "tn": int(cm_man[0, 0]),
                "fp": int(cm_man[0, 1]),
                "fn": int(cm_man[1, 0]),
                "tp": int(cm_man[1, 1])
            }
        },
        "ml_metrics": {
            "accuracy": round(ml_acc, 4),
            "precision": round(ml_prec, 4),
            "recall": round(ml_rec, 4),
            "f1": round(ml_f1, 4),
            "roc_auc": round(ml_roc, 4),
            "sensitivity": round(ml_rec, 4),
            "specificity": round(ml_spec, 4),
            "confusion_matrix": {
                "tn": int(cm_ml[0, 0]),
                "fp": int(cm_ml[0, 1]),
                "fn": int(cm_ml[1, 0]),
                "tp": int(cm_ml[1, 1])
            }
        },
        "agreement_rate": round(agreement, 4),
        "total_samples": total_images
    }
    
    # Save comparison JSON
    comp_json_path = os.path.join(config.RESULTS_DIR, 'model_comparison.json')
    with open(comp_json_path, 'w') as f:
        json.dump(results, f, indent=4)
    print(f"\nSaved comparison JSON: {comp_json_path}")
    
    # Generate Comparison Bar Chart
    metrics_names = ['Accuracy', 'Precision', 'Recall', 'Specificity', 'F1-Score']
    man_vals = [man_acc * 100, man_prec * 100, man_rec * 100, man_spec * 100, man_f1 * 100]
    ml_vals = [ml_acc * 100, ml_prec * 100, ml_rec * 100, ml_spec * 100, ml_f1 * 100]
    
    x = np.arange(len(metrics_names))
    width = 0.35
    
    plt.figure(figsize=(9, 5))
    plt.bar(x - width/2, man_vals, width, label='Traditional DIP Engine', color='#64748b')
    plt.bar(x + width/2, ml_vals, width, label='DenseNet-121 ML', color='#0d9488')
    plt.ylabel('Score (%)')
    plt.title(f'Multi-Method Performance Comparison (N={total_images})\nAgreement Rate: {agreement*100:.1f}%')
    plt.xticks(x, metrics_names)
    plt.ylim(0, 105)
    plt.legend(loc='lower right')
    plt.grid(axis='y', linestyle='--', alpha=0.4)
    plt.tight_layout()
    chart_path = os.path.join(config.RESULTS_DIR, 'comparison_chart.png')
    plt.savefig(chart_path, dpi=150)
    plt.close()
    print(f"Saved comparison chart: {chart_path}")
    
    # Generate Manual Confusion Matrix Plot
    plt.figure(figsize=(5, 4))
    sns.heatmap(cm_man, annot=True, fmt='d', cmap='Greys',
                xticklabels=['NORMAL', 'PNEUMONIA'],
                yticklabels=['NORMAL', 'PNEUMONIA'])
    plt.title(f"Traditional DIP Confusion Matrix\nAccuracy: {man_acc*100:.1f}%")
    plt.ylabel('Ground Truth')
    plt.xlabel('Predicted')
    plt.tight_layout()
    man_cm_path = os.path.join(config.RESULTS_DIR, 'manual_confusion_matrix.png')
    plt.savefig(man_cm_path, dpi=150)
    plt.close()
    print(f"Saved manual confusion matrix: {man_cm_path}")
    
    print("\n" + "=" * 60)
    print("COMPARISON RESULTS SUMMARY")
    print("=" * 60)
    print(f"{'Metric':<18} | {'Traditional DIP':<16} | {'DenseNet-121 ML':<16}")
    print("-" * 60)
    print(f"{'Accuracy':<18} | {man_acc*100:<15.2f}% | {ml_acc*100:<15.2f}%")
    print(f"{'Precision':<18} | {man_prec*100:<15.2f}% | {ml_prec*100:<15.2f}%")
    print(f"{'Recall (Sens.)':<18} | {man_rec*100:<15.2f}% | {ml_rec*100:<15.2f}%")
    print(f"{'Specificity':<18} | {man_spec*100:<15.2f}% | {ml_spec*100:<15.2f}%")
    print(f"{'F1-Score':<18} | {man_f1*100:<15.2f}% | {ml_f1*100:<15.2f}%")
    print(f"{'ROC-AUC':<18} | {'N/A':<16} | {ml_roc*100:<15.2f}%")
    print("-" * 60)
    print(f"Agreement Rate: {agreement*100:.2f}%")
    print("=" * 60)

if __name__ == '__main__':
    compare()
