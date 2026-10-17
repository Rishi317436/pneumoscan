import os
import json
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix
import config
import manual_detection

def evaluate():
    config.ensure_dirs()
    _, _, test_dir = config.get_dataset_paths()
    y_true = []
    y_pred = []
    
    print("Evaluating manual model on test set...")
    for class_name in config.CLASSES:
        d = os.path.join(test_dir, class_name)
        if not os.path.exists(d): continue
        for img in os.listdir(d):
            if img.endswith(('.jpeg', '.jpg', '.png')):
                res = manual_detection.detect(os.path.join(d, img))
                if "prediction" in res:
                    y_true.append(1 if class_name == 'PNEUMONIA' else 0)
                    y_pred.append(1 if res["prediction"] == 'PNEUMONIA' else 0)
    
    if not y_true:
        print("No test data found.")
        return

    acc = accuracy_score(y_true, y_pred)
    prec = precision_score(y_true, y_pred, zero_division=0)
    rec = recall_score(y_true, y_pred, zero_division=0)
    f1 = f1_score(y_true, y_pred, zero_division=0)
    cm = confusion_matrix(y_true, y_pred)
    spec = cm[0,0]/(cm[0,0]+cm[0,1]) if len(cm)>1 else 0
    
    metrics = {
        "accuracy": acc, "precision": prec, "recall": rec, "f1": f1,
        "sensitivity": rec, "specificity": spec
    }
    
    with open(os.path.join(config.RESULTS_DIR, 'manual_metrics.json'), 'w') as f:
        json.dump(metrics, f, indent=4)
        
    plt.figure(figsize=(6,5))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', xticklabels=config.CLASSES, yticklabels=config.CLASSES)
    plt.title("Manual Detection Confusion Matrix")
    plt.ylabel('True Label')
    plt.xlabel('Predicted Label')
    plt.savefig(os.path.join(config.RESULTS_DIR, 'manual_confusion_matrix.png'))
    plt.close()
    
    print("Manual evaluation complete. Metrics saved.")

if __name__ == '__main__':
    evaluate()
