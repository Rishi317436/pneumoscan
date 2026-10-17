import numpy as np
import cv2

try:
    from scipy.stats import entropy as scipy_entropy, skew as scipy_skew, kurtosis as scipy_kurtosis
    HAS_SCIPY = True
except ImportError:
    HAS_SCIPY = False

try:
    from skimage.feature import graycomatrix, graycoprops, local_binary_pattern
    HAS_SKIMAGE = True
except ImportError:
    HAS_SKIMAGE = False

def calculate_mean_intensity(gray):
    return float(np.mean(gray))

def calculate_std_deviation(gray):
    return float(np.std(gray))

def calculate_variance(gray):
    return float(np.var(gray))

def calculate_entropy(gray):
    hist, _ = np.histogram(gray.ravel(), bins=256, range=(0, 256))
    prob = hist.astype(np.float64) / max(1, np.sum(hist))
    if HAS_SCIPY:
        return float(scipy_entropy(prob, base=2))
    non_zero = prob[prob > 0]
    return float(-np.sum(non_zero * np.log2(non_zero)))

def calculate_contrast(gray):
    return float(np.max(gray) - np.min(gray))

def calculate_edge_density(gray):
    edges = cv2.Canny(gray, 100, 200)
    return float(np.sum(edges > 0) / max(1, edges.size))

def calculate_lbp_features(gray):
    if HAS_SKIMAGE:
        try:
            lbp = local_binary_pattern(gray, P=8, R=1, method='uniform')
            return float(np.mean(lbp)), float(np.var(lbp))
        except Exception:
            pass
    # Fast pure numpy 8-neighbor LBP approximation
    try:
        h, w = gray.shape
        center = gray[1:h-1, 1:w-1]
        patterns = np.zeros_like(center, dtype=np.uint8)
        patterns |= (gray[0:h-2, 0:w-2] >= center) << 7
        patterns |= (gray[0:h-2, 1:w-1] >= center) << 6
        patterns |= (gray[0:h-2, 2:w]   >= center) << 5
        patterns |= (gray[1:h-1, 2:w]   >= center) << 4
        patterns |= (gray[2:h,   2:w]   >= center) << 3
        patterns |= (gray[2:h,   1:w-1] >= center) << 2
        patterns |= (gray[2:h,   0:w-2] >= center) << 1
        patterns |= (gray[1:h-1, 0:w-2] >= center) << 0
        return float(np.mean(patterns) / 10.0), float(np.var(patterns) / 100.0)
    except Exception:
        return 0.0, 0.0

def calculate_histogram_stats(gray):
    if HAS_SCIPY:
        try:
            return float(scipy_skew(gray.ravel())), float(scipy_kurtosis(gray.ravel()))
        except Exception:
            pass
    # Pure numpy skew & kurtosis
    mean = np.mean(gray)
    std = np.std(gray) + 1e-7
    diff = gray - mean
    skewness = float(np.mean(diff ** 3) / (std ** 3))
    kurtosis = float(np.mean(diff ** 4) / (std ** 4) - 3.0)
    return skewness, kurtosis

def calculate_glcm_features(gray):
    if HAS_SKIMAGE:
        try:
            glcm = graycomatrix(gray, distances=[1], angles=[0], levels=256, symmetric=True, normed=True)
            contrast = float(graycoprops(glcm, 'contrast')[0, 0])
            dissimilarity = float(graycoprops(glcm, 'dissimilarity')[0, 0])
            homogeneity = float(graycoprops(glcm, 'homogeneity')[0, 0])
            energy = float(graycoprops(glcm, 'energy')[0, 0])
            correlation = float(graycoprops(glcm, 'correlation')[0, 0])
            return contrast, dissimilarity, homogeneity, energy, correlation
        except Exception:
            pass
    # Fast pure numpy GLCM proxy
    try:
        diff_h = np.abs(gray[:, 1:].astype(np.float64) - gray[:, :-1].astype(np.float64))
        contrast = float(np.mean(diff_h ** 2))
        dissimilarity = float(np.mean(diff_h))
        homogeneity = float(np.mean(1.0 / (1.0 + diff_h)))
        energy = float(np.mean((gray.astype(np.float64) / 255.0) ** 2))
        correlation = float(np.corrcoef(gray[:, :-1].ravel(), gray[:, 1:].ravel())[0, 1])
        if np.isnan(correlation):
            correlation = 0.0
        return contrast, dissimilarity, homogeneity, energy, correlation
    except Exception:
        return 0.0, 0.0, 0.0, 0.0, 0.0

def calculate_uniformity(gray):
    hist, _ = np.histogram(gray.ravel(), bins=256, range=(0, 256))
    prob = hist.astype(np.float64) / max(1, np.sum(hist))
    return float(np.sum(prob ** 2))

def calculate_brightness_distribution(gray):
    try:
        threshold = np.mean(gray) + np.std(gray)
        bright_pixels = np.sum(gray > threshold)
        return float(bright_pixels / max(1, gray.size))
    except Exception:
        return 0.0

def extract_all_features(gray):
    """Extracts all features from a grayscale image."""
    if gray is None or gray.size == 0:
        return {}
    try:
        lbp_mean, lbp_var = calculate_lbp_features(gray)
        skewness, kurt = calculate_histogram_stats(gray)
        contrast_glcm, dissim, homog, energy, corr = calculate_glcm_features(gray)
        
        return {
            "mean_intensity": calculate_mean_intensity(gray),
            "std_dev": calculate_std_deviation(gray),
            "variance": calculate_variance(gray),
            "entropy": calculate_entropy(gray),
            "contrast": calculate_contrast(gray),
            "edge_density": calculate_edge_density(gray),
            "lbp_mean": lbp_mean,
            "lbp_variance": lbp_var,
            "hist_skewness": skewness,
            "hist_kurtosis": kurt,
            "glcm_contrast": contrast_glcm,
            "glcm_dissimilarity": dissim,
            "glcm_homogeneity": homog,
            "glcm_energy": energy,
            "glcm_correlation": corr,
            "uniformity": calculate_uniformity(gray),
            "brightness_ratio": calculate_brightness_distribution(gray)
        }
    except Exception as e:
        return {}
