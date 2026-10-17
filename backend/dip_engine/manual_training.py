import os
import json
import numpy as np
from datetime import datetime
import config
import preprocess
import feature_extraction

def process_directory(directory):
    features_list = []
    if not os.path.exists(directory):
        print(f"Warning: Directory {directory} not found.")
        return features_list
        
    for img_name in os.listdir(directory):
        if img_name.endswith(('.jpeg', '.jpg', '.png')):
            path = os.path.join(directory, img_name)
            try:
                gray = preprocess.preprocess_for_manual(path)
                feats = feature_extraction.extract_all_features(gray)
                if feats:
                    features_list.append(feats)
            except Exception as e:
                pass
    return features_list

def calculate_stats(features_list):
    if not features_list: return {}
    keys = features_list[0].keys()
    stats = {'mean': {}, 'std': {}, 'min': {}, 'max': {}}
    for k in keys:
        vals = [f[k] for f in features_list if k in f]
        if vals:
            stats['mean'][k] = float(np.mean(vals))
            stats['std'][k] = float(np.std(vals))
            stats['min'][k] = float(np.min(vals))
            stats['max'][k] = float(np.max(vals))
    return stats

def main():
    config.ensure_dirs()
    train_dir, _, _ = config.get_dataset_paths()
    
    norm_dir = os.path.join(train_dir, 'NORMAL')
    pneu_dir = os.path.join(train_dir, 'PNEUMONIA')
    
    print("Processing NORMAL training images...")
    norm_features = process_directory(norm_dir)
    print(f"Processed {len(norm_features)} NORMAL images.")
    
    print("Processing PNEUMONIA training images...")
    pneu_features = process_directory(pneu_dir)
    print(f"Processed {len(pneu_features)} PNEUMONIA images.")
    
    norm_stats = calculate_stats(norm_features)
    pneu_stats = calculate_stats(pneu_features)
    
    all_features = norm_features + pneu_features
    all_stats = calculate_stats(all_features)
    
    weights = {}
    if norm_stats and pneu_stats:
        for k in norm_stats['mean'].keys():
            # Use absolute difference in means as a basic correlation proxy
            diff = pneu_stats['mean'][k] - norm_stats['mean'][k]
            weights[k] = diff
            
    thresholds = {
        "feature_statistics": {"NORMAL": norm_stats, "PNEUMONIA": pneu_stats},
        "normalization": {"min": all_stats.get('min', {}), "max": all_stats.get('max', {})},
        "weights": weights,
        "decision_threshold": 50.0,
        "decision_rule": "Weighted sum of normalized features >= 50 indicates PNEUMONIA",
        "training_info": {
            "total_normal": len(norm_features),
            "total_pneumonia": len(pneu_features),
            "date": datetime.now().isoformat()
        }
    }
    
    with open(config.THRESHOLDS_PATH, 'w') as f:
        json.dump(thresholds, f, indent=4)
    print(f"Saved traditional thresholds to {config.THRESHOLDS_PATH}")

if __name__ == '__main__':
    main()
