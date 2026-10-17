# AI-Based Pneumonia Detection & Multi-Method Comparison System

An enterprise-grade, full-stack medical informatics platform comparing **Traditional Digital Image Processing (DIP)** heuristics with **Deep Learning Transfer Learning (DenseNet-121)** for automated pneumonia detection from chest radiographs (X-rays), featuring explainable AI (Grad-CAM), dual-method concordance analysis, and a comprehensive clinical reporting system.

---

## Architecture Overview

```
                          ┌───────────────────────────┐
                          │   Patient Chest X-Ray     │
                          └─────────────┬─────────────┘
                                        │
                    ┌───────────────────┴───────────────────┐
                    ▼                                       ▼
     ┌─────────────────────────────┐        ┌─────────────────────────────┐
     │  METHOD 1: Traditional DIP  │        │   METHOD 2: Deep Learning   │
     │  - CLAHE Contrast Enhance   │        │   - DenseNet-121 CNN        │
     │  - 12+ Statistical Features │        │   - Class-Weighted Loss     │
     │  - LBP & GLCM Texture       │        │   - Grad-CAM Heatmap        │
     │  - Calibrated Thresholding  │        │   - Sigmoid Probability     │
     └──────────────┬──────────────┘        └──────────────┬──────────────┘
                    │                                       │
                    └───────────────────┬───────────────────┘
                                        ▼
                         ┌─────────────────────────────┐
                         │    METHOD 3: Comparison     │
                         │    - Concordance / Disagree │
                         │    - Score Delta Analysis   │
                         │    - Combined Index (0.3/0.7)
                         │    - Medical Report & View  │
                         └─────────────────────────────┘
```

---

## Project Structure

```
├── .env                              # Environment variables (DB URI, secret, dataset path)
├── package.json                      # Node.js dependencies & scripts
├── server.js                         # Express application entry point
├── config/
│   ├── db.js                         # MongoDB connection configuration
│   └── multer.js                     # File upload storage & MIME filter
├── controllers/
│   ├── adminController.js            # Admin analytics, training dashboard & User CRUD
│   ├── authController.js             # User login, registration & session handling
│   ├── feedbackController.js         # User feedback & rating submissions
│   ├── reportController.js           # Clinical diagnostic report generation
│   └── scanController.js             # Upload coordinator & Python subprocess runner
├── dip_engine/                       # Python Computer Vision & ML Subsystem
│   ├── config.py                     # Central configuration & paths
│   ├── preprocess.py                 # Image normalization, grayscale, CLAHE, resizing
│   ├── feature_extraction.py         # Mean, Std, Entropy, LBP, GLCM, Edge Density
│   ├── manual_detection.py           # Traditional feature-based rule engine
│   ├── manual_training.py            # Training set threshold calibration script
│   ├── manual_evaluation.py          # Benchmark traditional method on test set
│   ├── train_binary_model.py         # DenseNet-121 transfer learning training script
│   ├── predict_ml.py                 # Neural network single-image inference
│   ├── evaluate_model.py             # Benchmark ML model with ROC-AUC & Confusion Matrix
│   ├── compare_methods.py            # Dual-method dataset-level comparative benchmark
│   ├── gradcam.py                    # Gradient-weighted Class Activation Mapping
│   ├── train_etiology_model.py       # Future etiology classification scaffold
│   ├── detect_pneumonia.py           # Main Python CLI called by Node.js backend
│   ├── requirements.txt              # Python ML & Computer Vision dependencies
│   ├── models/                       # Stored model weights & threshold JSONs
│   └── results/                      # Evaluation JSONs, confusion matrices & charts
├── middleware/
│   ├── auth.js                       # Session authentication middleware
│   ├── roleCheck.js                  # Administrator role check middleware
│   └── upload.js                     # Multer image upload middleware
├── models/
│   ├── ActivityLog.js                # System audit trail
│   ├── Algorithm.js                  # Algorithm catalog & metadata
│   ├── ChestXrayDetection.js         # Dual-method detection & comparison records
│   ├── ChestXrayScan.js              # Radiograph file metadata
│   ├── Feedback.js                   # Patient & clinician feedback
│   ├── Notification.js               # Diagnostic alerts & notifications
│   ├── Report.js                     # Clinical summary reports
│   ├── Session.js                    # User session logging
│   └── User.js                       # User credentials with bcrypt hashing
├── public/
│   ├── css/                          # Modern glassmorphism stylesheets & theme.css
│   ├── js/main.js                    # Theme toggling, drag-and-drop & dynamic UI
│   └── images/                       # UI branding assets & iconography
├── routes/
│   ├── adminRoutes.js                # Admin portal & user management
│   ├── authRoutes.js                 # Authentication endpoints
│   ├── comparisonRoutes.js           # Dataset-level benchmark comparison
│   ├── feedbackRoutes.js             # Feedback submission routes
│   ├── reportRoutes.js               # Diagnostic report views
│   └── scanRoutes.js                 # Radiograph upload & analysis details
└── views/                            # EJS Server-Side Rendered Templates
    ├── partials/                     # header.ejs & footer.ejs
    ├── dashboard.ejs                 # Clinician home & workflow
    ├── upload.ejs                    # Drag-and-drop upload with clinical context
    ├── result.ejs                    # Scan history list with dual-method columns
    ├── result_detail.ejs             # Multi-method breakdown & Grad-CAM inspection
    ├── comparison.ejs                # Statistical dataset benchmarking page
    ├── admin.ejs                     # Administrative dashboard
    ├── admin_training.ejs            # Model status & calibration dashboard
    ├── reports.ejs                   # Clinical report library
    ├── feedback.ejs                  # User feedback portal
    ├── user_list.ejs                 # Administrator user management table
    └── user_form.ejs                 # User creation & edit modal
```

---

## Installation & Setup

### 1. Prerequisites
- **Node.js**: v18+ recommended
- **Python**: 3.9+ with `pip`
- **MongoDB**: Local MongoDB instance (`mongodb://localhost:27017`) or MongoDB Atlas URI

### 2. Node.js Backend Setup
```bash
# Install Node.js dependencies
npm install
```

### 3. Python Environment Setup
```bash
# (Optional) Create and activate a virtual environment
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# Install Python requirements
pip install -r dip_engine/requirements.txt
```

### 4. Configure Environment Variables
Edit `.env` as needed:
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/pneumonia_detection_db
SESSION_SECRET=pneumonia_detection_secret_2024
PYTHON_PATH=python
DATASET_PATH=./chest_xray
```

---

## Dataset & Training Workflow

### 1. Downloading Dataset
Download the Kaggle Chest X-Ray Images (Pneumonia) dataset from:
[https://www.kaggle.com/datasets/paultimothymooney/chest-xray-pneumonia](https://www.kaggle.com/datasets/paultimothymooney/chest-xray-pneumonia)

Extract into `./chest_xray/` (or update `DATASET_PATH` in `.env`):
```
chest_xray/
├── train/
│   ├── NORMAL/
│   └── PNEUMONIA/
├── val/
│   ├── NORMAL/
│   └── PNEUMONIA/
└── test/
    ├── NORMAL/
    └── PNEUMONIA/
```

### 2. Calibrate Traditional DIP Thresholds
Calculates statistical distributions (mean, entropy, GLCM, LBP) on the training set and saves optimal decision boundaries to `dip_engine/models/manual_thresholds.json`:
```bash
python dip_engine/manual_training.py
```

### 3. Train DenseNet-121 Transfer Learning Model
Trains the deep learning neural network with class-weight imbalance handling, data augmentation, EarlyStopping, and ReduceLROnPlateau:
```bash
python dip_engine/train_binary_model.py
```

### 4. Run Comparative Benchmarking
Runs both methods on the untouched test partition and generates side-by-side metrics, confusion matrices, and comparison bar charts:
```bash
python dip_engine/compare_methods.py
```

---

## Starting the Web Application

```bash
# Start server in production mode
npm start

# Or start in development mode with auto-reloading
npm run dev
```

Navigate to [http://localhost:3000](http://localhost:3000) in your browser.

### Key Capabilities in Web UI:
1. **User Portal**: Register an account and sign in.
2. **Analysis Upload**: Drag and drop any Chest X-Ray (`.jpg`, `.png`). Fill in optional clinical symptoms or acquisition parameters.
3. **Dual-Method Report**:
   - **Method 1 (Traditional DIP)**: View 12+ statistical image features, normalized opacity score, and rule-based decision explanation.
   - **Method 2 (DenseNet-121 ML)**: View neural classification probability, model version, and **Grad-CAM attention heatmap overlay**.
   - **Method 3 (Comparison)**: View concordance status (`AGREE` / `DISAGREE`), probability delta, and Experimental Combined Research Score.
4. **Dataset Benchmark Page**: Review test set accuracy, precision, recall, specificity, and confusion matrices.
5. **Admin Hub**: Monitor user accounts, inspect activity logs, and view model weight / threshold statuses.

---

## Medical & Regulatory Disclaimer
*This platform is an AI research, educational, and computational demonstration tool. Results produced by traditional image processing algorithms and deep learning neural networks should never be treated as primary diagnostic determinations or clinical recommendations. Clinical decisions must always be made by qualified healthcare practitioners with formal clinical, radiological, and microbiological evaluations.*
