import os
import numpy as np
import cv2
import argparse
import config
import preprocess
import predict_ml

def generate_gradcam(model, img_array, layer_name=None):
    try:
        import tensorflow as tf
    except ImportError:
        return None

    if layer_name is None:
        for layer in reversed(model.layers):
            if hasattr(layer, 'output_shape') and len(layer.output_shape) == 4:
                layer_name = layer.name
                break
            elif hasattr(layer, 'output') and len(layer.output.shape) == 4:
                layer_name = layer.name
                break
                
    grad_model = tf.keras.models.Model(
        inputs=[model.inputs],
        outputs=[model.get_layer(layer_name).output, model.output]
    )
    
    with tf.GradientTape() as tape:
        conv_outputs, predictions = grad_model(img_array)
        loss = predictions[:, 0]
        
    grads = tape.gradient(loss, conv_outputs)
    pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))
    
    conv_outputs = conv_outputs[0]
    heatmap = conv_outputs @ pooled_grads[..., tf.newaxis]
    heatmap = tf.squeeze(heatmap)
    heatmap = tf.maximum(heatmap, 0) / (tf.math.reduce_max(heatmap) + 1e-7)
    return heatmap.numpy()

def create_overlay(original_img, heatmap, alpha=0.4):
    heatmap = cv2.resize(heatmap, (original_img.shape[1], original_img.shape[0]))
    heatmap = np.uint8(255 * heatmap)
    heatmap = cv2.applyColorMap(heatmap, cv2.COLORMAP_JET)
    return cv2.addWeighted(original_img, alpha, heatmap, 1 - alpha, 0)

def process_image_gradcam(image_path, output_path):
    model = predict_ml.load_model_cached()
    img = preprocess.preprocess_for_ml(image_path)
    img_array = np.expand_dims(img, axis=0)
    
    heatmap = generate_gradcam(model, img_array)
    if heatmap is None:
        return None
        
    orig_img = cv2.imread(image_path)
    if orig_img is None:
        return None
    orig_img = cv2.resize(orig_img, config.IMAGE_SIZE)
    
    overlay = create_overlay(orig_img, heatmap)
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    cv2.imwrite(output_path, overlay)
    return output_path

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('image_path')
    parser.add_argument('output_path')
    args = parser.parse_args()
    process_image_gradcam(args.image_path, args.output_path)
