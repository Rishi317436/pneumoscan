import os
import json
import argparse
import numpy as np
import config
import preprocess

_LITERT_INTERPRETER = None
_KERAS_MODEL = None
_MODEL_TYPE = None

def get_tflite_path():
    candidates = [
        os.path.join(config.BASE_DIR, 'models', 'pneumonia_binary_model.tflite'),
        os.path.join(os.path.dirname(config.BASE_DIR), 'dip_engine', 'models', 'pneumonia_binary_model.tflite'),
        os.path.join(os.path.dirname(config.BASE_DIR), 'backend', 'dip_engine', 'models', 'pneumonia_binary_model.tflite'),
    ]
    for p in candidates:
        if p and os.path.exists(p):
            return p
    return None

def load_inference_engine():
    global _LITERT_INTERPRETER, _KERAS_MODEL, _MODEL_TYPE
    if _MODEL_TYPE is not None:
        return _MODEL_TYPE

    # 1. Prefer LiteRT (TensorFlow Lite) — uses < 35 MB RAM (prevents Render 512MB OOM)
    tflite_path = get_tflite_path()
    if tflite_path:
        try:
            try:
                from ai_edge_litert.interpreter import Interpreter
            except ImportError:
                try:
                    import tflite_runtime.interpreter as tflite
                    Interpreter = tflite.Interpreter
                except ImportError:
                    from tensorflow.lite.python.interpreter import Interpreter # type: ignore
            
            interpreter = Interpreter(model_path=tflite_path)
            interpreter.allocate_tensors()
            _LITERT_INTERPRETER = interpreter
            _MODEL_TYPE = 'litert'
            return _MODEL_TYPE
        except Exception as e:
            pass

    # 2. Fallback to Keras model if TFLite not available
    if os.path.exists(config.MODEL_PATH):
        try:
            os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'
            os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
            import tensorflow as tf
            _KERAS_MODEL = tf.keras.models.load_model(config.MODEL_PATH)
            _MODEL_TYPE = 'keras'
            return _MODEL_TYPE
        except Exception as e:
            pass

    raise FileNotFoundError("Could not initialize DenseNet-121 inference engine (neither TFLite nor Keras model found).")

def predict(image_path):
    try:
        engine_type = load_inference_engine()
        img = preprocess.preprocess_for_ml(image_path)
        img_batch = np.expand_dims(img, axis=0).astype(np.float32)

        if engine_type == 'litert':
            inp_idx = _LITERT_INTERPRETER.get_input_details()[0]['index']
            out_idx = _LITERT_INTERPRETER.get_output_details()[0]['index']
            _LITERT_INTERPRETER.set_tensor(inp_idx, img_batch)
            _LITERT_INTERPRETER.invoke()
            raw_prob = float(_LITERT_INTERPRETER.get_tensor(out_idx)[0][0])
        else:
            raw_prob = float(_KERAS_MODEL.predict(img_batch, verbose=0)[0][0])

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
