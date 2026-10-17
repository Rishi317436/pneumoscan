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

# -------------------------------------------------------------
# New DIP Engine & 6-Zone Anatomical Parameters
# -------------------------------------------------------------
PROCESSING_WIDTH: int = 512
PROCESSING_HEIGHT: int = 512

GAUSSIAN_KERNEL_SIZE: int = 3
MEDIAN_KERNEL_SIZE: int = 3
USE_MEDIAN_FILTER: bool = False
PERCENTILE_LOW: float = 1.0
PERCENTILE_HIGH: float = 99.0

CLAHE_CLIP_LIMIT: float = 2.0
CLAHE_TILE_GRID_SIZE: tuple = (8, 8)

CANNY_LOWER_THRESHOLD: int = 80
CANNY_UPPER_THRESHOLD: int = 180

LBP_POINTS: int = 8
LBP_RADIUS: int = 1
GLCM_DISTANCES = [1, 2]
GLCM_ANGLES = [0.0, 0.785398, 1.570796, 2.356194]
GLCM_LEVELS: int = 32

LOCAL_WINDOW_SIZE: int = 24
LOCAL_WINDOW_STRIDE: int = 8

MORPH_KERNEL_SIZE: int = 7
MIN_ABNORMAL_REGION_AREA: int = 120

ZONE_SUSPICIOUS_THRESHOLD: float = 38.0
ZONE_ABNORMAL_THRESHOLD: float = 55.0
FEATURE_AGREEMENT_MIN_GROUPS: int = 2

WEIGHT_INTENSITY: float = 0.25
WEIGHT_ASYMMETRY: float = 0.25
WEIGHT_TEXTURE: float = 0.20
WEIGHT_LOCAL_CONTRAST: float = 0.15
WEIGHT_CANDIDATE_REGIONS: float = 0.15

MEDICAL_DISCLAIMER: str = (
    "This system is an academic research application utilizing traditional digital image processing (DIP). "
    "It is NOT a certified medical diagnostic system and results must NOT replace professional radiological evaluation."
)


