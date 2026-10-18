"""
PneumoScan Bridge Module: backend/dip_engine/pipeline.py
Guarantees that `import pipeline` or `from dip_engine.pipeline import ...` works seamlessly if called from backend context.
"""
import os
import sys

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(CURRENT_DIR)
WORKSPACE_ROOT = os.path.dirname(BACKEND_DIR)
ROOT_DIP_ENGINE = os.path.join(WORKSPACE_ROOT, "dip_engine")
NESTED_DIP_ENGINE = os.path.join(ROOT_DIP_ENGINE, "dip_engine")

for p in [NESTED_DIP_ENGINE, ROOT_DIP_ENGINE, WORKSPACE_ROOT, CURRENT_DIR]:
    if p and os.path.exists(p) and p not in sys.path:
        sys.path.insert(0, p)

try:
    from dip_engine.dip_engine.pipeline import *
    from dip_engine.dip_engine.pipeline import run_dip_analysis_pipeline
except ImportError:
    try:
        from dip_engine.pipeline import *
        from dip_engine.pipeline import run_dip_analysis_pipeline
    except ImportError:
        from pipeline import *
        from pipeline import run_dip_analysis_pipeline
