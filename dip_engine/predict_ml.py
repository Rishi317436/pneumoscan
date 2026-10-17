import os
import json
import argparse
import numpy as np
import config
import preprocess

_MODEL_CACHE = None

def load_model_cached():
    global _MODEL_CACHE
    if _MODEL_CACHE is None:
        try:
            import tensorflow as tf
        except ImportError:
            raise ImportError("TensorFlow is not installed in the current Python environment. Install with: pip install tensorflow")
        
        if not os.path.exists(config.MODEL_PATH):
            raise FileNotFoundError(f"Trained model not found at {config.MODEL_PATH}. Run train_binary_model.py first.")
        _MODEL_CACHE = tf.keras.models.load_model(config.MODEL_PATH)
    return _MODEL_CACHE

def predict(image_path):
    try:
        model = load_model_cached()
        img = preprocess.preprocess_for_ml(image_path)
        img = np.expand_dims(img, axis=0)
        
        # Raw probability from sigmoid activation:
        # Class 0 = NORMAL, Class 1 = PNEUMONIA
        raw_prob = float(model.predict(img, verbose=0)[0][0])
        threshold = 0.5
        
        if raw_prob >= threshold:
            prediction = 'PNEUMONIA'
            confidence = float(raw_prob)
        else:
            prediction = 'NORMAL'
            confidence = float(1.0 - raw_prob)
        
        return {
            "prediction": prediction,
            "confidence": round(confidence, 4),
            "rawProbability": round(raw_prob, 4),
            "threshold": threshold,
            "modelVersion": "DenseNet121_TransferLearning"
        }
    except Exception as e:
        return {"error": str(e)}

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('image_path')
    args = parser.parse_args()
    result = predict(args.image_path)
    print(json.dumps(result))
