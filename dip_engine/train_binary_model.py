import os
import sys
import json
import numpy as np
import tensorflow as tf
from tensorflow.keras.applications import DenseNet121 # type: ignore
from tensorflow.keras.layers import GlobalAveragePooling2D, Dense, Dropout, BatchNormalization # type: ignore
from tensorflow.keras.models import Model # type: ignore
from tensorflow.keras.optimizers import Adam # type: ignore
from tensorflow.keras.preprocessing.image import ImageDataGenerator # type: ignore
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint, ReduceLROnPlateau # type: ignore
import config

def train():
    config.ensure_dirs()
    train_dir, _, test_dir = config.get_dataset_paths()
    
    print("=" * 60)
    print("PNEUMONIA DETECTION - ML MODEL TRAINING PIPELINE")
    print("=" * 60)
    print(f"Dataset Path : {config.DATASET_PATH}")
    print(f"Train Dir    : {train_dir}")
    print(f"Test Dir     : {test_dir} (UNTOUCHED FOR FINAL EVALUATION)")
    print(f"Target Size  : {config.IMAGE_SIZE}")
    print(f"Batch Size   : {config.BATCH_SIZE}")
    print(f"Output Model : {config.MODEL_PATH}")
    print("-" * 60)
    
    if not os.path.exists(train_dir):
        raise FileNotFoundError(f"Training directory not found at {train_dir}")
        
    print("\n[1/5] Setting up Stratified Data Generators (Validation Split = 15%)...")
    # Training Data Generator with Data Augmentation
    train_datagen = ImageDataGenerator(
        rescale=1.0 / 255.0,
        rotation_range=15,
        zoom_range=0.15,
        width_shift_range=0.1,
        height_shift_range=0.1,
        shear_range=0.1,
        brightness_range=[0.85, 1.15],
        fill_mode='nearest',
        horizontal_flip=False,  # Preserve cardiopulmonary anatomical orientation
        validation_split=0.15
    )
    
    # Validation Data Generator (Rescaling Only)
    val_datagen = ImageDataGenerator(
        rescale=1.0 / 255.0,
        validation_split=0.15
    )
    
    train_gen = train_datagen.flow_from_directory(
        train_dir,
        target_size=config.IMAGE_SIZE,
        batch_size=config.BATCH_SIZE,
        class_mode='binary',
        subset='training',
        shuffle=True,
        seed=42
    )
    
    val_gen = val_datagen.flow_from_directory(
        train_dir,
        target_size=config.IMAGE_SIZE,
        batch_size=config.BATCH_SIZE,
        class_mode='binary',
        subset='validation',
        shuffle=False,
        seed=42
    )
    
    print(f"Class Indices: {train_gen.class_indices}")
    assert train_gen.class_indices.get('NORMAL') == 0, "NORMAL must map to class index 0"
    assert train_gen.class_indices.get('PNEUMONIA') == 1, "PNEUMONIA must map to class index 1"
    
    print("\n[2/5] Calculating Class Weights to handle dataset imbalance...")
    counts = np.bincount(train_gen.classes)
    total_samples = len(train_gen.classes)
    normal_count = counts[0]
    pneumonia_count = counts[1]
    
    weight_for_0 = float(total_samples) / (2.0 * float(normal_count))
    weight_for_1 = float(total_samples) / (2.0 * float(pneumonia_count))
    class_weights = {0: weight_for_0, 1: weight_for_1}
    
    print(f"Training Samples   : Total={total_samples} (NORMAL={normal_count}, PNEUMONIA={pneumonia_count})")
    print(f"Validation Samples : Total={len(val_gen.classes)} (NORMAL={np.sum(val_gen.classes == 0)}, PNEUMONIA={np.sum(val_gen.classes == 1)})")
    print(f"Class Weights      : NORMAL (0)={weight_for_0:.4f}, PNEUMONIA (1)={weight_for_1:.4f}")
    
    print("\n[3/5] Building DenseNet-121 Transfer Learning Architecture...")
    base_model = DenseNet121(
        weights='imagenet',
        include_top=False,
        input_shape=(*config.IMAGE_SIZE, 3)
    )
    
    # Fine-tuning: freeze early feature blocks, keep top blocks trainable
    base_model.trainable = True
    for layer in base_model.layers[:250]:
        layer.trainable = False
        
    x = base_model.output
    x = GlobalAveragePooling2D(name='global_avg_pool')(x)
    x = BatchNormalization(name='batch_norm_top')(x)
    x = Dense(256, activation='relu', name='dense_256')(x)
    x = Dropout(0.5, name='dropout_top')(x)
    predictions = Dense(1, activation='sigmoid', name='output_sigmoid')(x)
    
    model = Model(inputs=base_model.input, outputs=predictions)
    
    model.compile(
        optimizer=Adam(learning_rate=1e-4),
        loss='binary_crossentropy',
        metrics=['accuracy']
    )
    
    print(f"Total Model Parameters: {model.count_params():,}")
    
    print("\n[4/5] Setting up Callbacks and Checkpoints...")
    callbacks = [
        ModelCheckpoint(
            filepath=config.MODEL_PATH,
            monitor='val_accuracy',
            mode='max',
            save_best_only=True,
            verbose=1
        ),
        EarlyStopping(
            monitor='val_loss',
            patience=5,
            restore_best_weights=True,
            verbose=1
        ),
        ReduceLROnPlateau(
            monitor='val_loss',
            factor=0.5,
            patience=2,
            min_lr=1e-6,
            verbose=1
        )
    ]
    
    epochs = int(os.environ.get('EPOCHS', 6))
    print(f"\n[5/5] Training for {epochs} Epochs...")
    history = model.fit(
        train_gen,
        validation_data=val_gen,
        epochs=epochs,
        class_weight=class_weights,
        callbacks=callbacks
    )
    
    print(f"\nModel training finished. Best model saved to: {config.MODEL_PATH}")
    
    # Save training history summary
    hist_dict = {k: [float(v) for v in vals] for k, vals in history.history.items()}
    with open(os.path.join(config.RESULTS_DIR, 'training_history.json'), 'w') as f:
        json.dump(hist_dict, f, indent=4)
        
    # Run evaluation on untouched test set
    print("\nRunning evaluation on untouched test set...")
    import evaluate_model
    evaluate_model.evaluate()
    
    return model

if __name__ == '__main__':
    train()
