import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def find_dataset_path():
    candidate_paths = [
        os.environ.get('DATASET_PATH'),
        os.path.join(BASE_DIR, '..', 'dataset', 'chest_xray'),
        os.path.join(BASE_DIR, '..', 'chest_xray'),
        os.path.join(BASE_DIR, 'chest_xray'),
        '/mnt/d/brain-tumour-detection/dataset/chest_xray',
        '/mnt/d/brain-tumour-detection/chest_xray',
        'D:/brain-tumour-detection/dataset/chest_xray',
        'D:/brain-tumour-detection/chest_xray',
        'D:\\brain-tumour-detection\\dataset\\chest_xray',
        'D:\\brain-tumour-detection\\chest_xray',
        '/home/rishi/PneumoniaML-clean/dataset',
        'D:/PneumoniaML/dataset',
        '/mnt/d/PneumoniaML/dataset'
    ]
    for p in candidate_paths:
        if p and os.path.exists(p) and os.path.exists(os.path.join(p, 'train')):
            return os.path.abspath(p)
    return os.path.abspath(os.path.join(BASE_DIR, '..', 'chest_xray'))

DATASET_PATH = find_dataset_path()
MODEL_PATH = os.path.join(BASE_DIR, 'models', 'pneumonia_binary_model.keras')
THRESHOLDS_PATH = os.path.join(BASE_DIR, 'models', 'manual_thresholds.json')
RESULTS_DIR = os.path.join(BASE_DIR, 'results')
IMAGE_SIZE = (224, 224)
BATCH_SIZE = 32
EPOCHS = 15
CLASSES = ['NORMAL', 'PNEUMONIA']

def get_dataset_paths():
    """Returns the train, validation, and test dataset directory paths."""
    train_dir = os.path.join(DATASET_PATH, 'train')
    val_dir = os.path.join(DATASET_PATH, 'val')
    test_dir = os.path.join(DATASET_PATH, 'test')
    return train_dir, val_dir, test_dir

def ensure_dirs():
    """Ensure that the necessary output directories exist."""
    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    os.makedirs(RESULTS_DIR, exist_ok=True)
