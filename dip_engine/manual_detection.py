import json
import sys
import os
import argparse
import config
import preprocess
import feature_extraction

def load_thresholds(path):
    if not os.path.exists(path):
        return None
    with open(path, 'r') as f:
        return json.load(f)

def normalize_features(features, stats):
    normalized = {}
    min_vals = stats.get('min', {})
    max_vals = stats.get('max', {})
    for k, v in features.items():
        min_v = min_vals.get(k, 0)
        max_v = max_vals.get(k, 1)
        if max_v > min_v:
            normalized[k] = (v - min_v) / (max_v - min_v)
        else:
            normalized[k] = 0.0
    return normalized

def calculate_manual_score(normalized_features, weights):
    score = 0.0
    total_weight = sum(abs(w) for w in weights.values())
    if total_weight == 0:
        return 0.0
    for k, v in normalized_features.items():
        score += v * weights.get(k, 0)
    # Normalize score to 0-100 range based on possible max
    final_score = (score / total_weight) * 100 if total_weight > 0 else 0
    return max(0.0, min(100.0, final_score))

def apply_decision_rule(score, threshold):
    return 'PNEUMONIA' if score >= threshold else 'NORMAL'

def generate_explanation(features, thresholds):
    return f"Decision made using weighted sum of normalized features. Decision threshold is {thresholds.get('decision_threshold', 50)}."

def detect(image_path):
    try:
        gray = preprocess.preprocess_for_manual(image_path)
        features = feature_extraction.extract_all_features(gray)
        
        thresholds_data = load_thresholds(config.THRESHOLDS_PATH)
        if thresholds_data is None:
            return {"error": "Thresholds file not found. Run manual_training.py first."}
        
        norm_stats = thresholds_data.get('normalization', {})
        normalized_features = normalize_features(features, norm_stats)
        weights = thresholds_data.get('weights', {})
        
        score = calculate_manual_score(normalized_features, weights)
        threshold = thresholds_data.get('decision_threshold', 50.0)
        prediction = apply_decision_rule(score, threshold)
        explanation = generate_explanation(features, thresholds_data)
        
        return {
            "prediction": prediction,
            "score": score,
            "features": features,
            "decisionExplanation": explanation
        }
    except Exception as e:
        return {"error": str(e)}

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('image_path', help="Path to image")
    args = parser.parse_args()
    
    result = detect(args.image_path)
    print(json.dumps(result))
