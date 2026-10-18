"""
PneumoScan Bridge Module: dip_engine/pipeline.py
Guarantees that `import pipeline` or `from dip_engine.pipeline import ...` works seamlessly from any context without circular imports.
"""
import os
import sys
import importlib.util

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
NESTED_DIR = os.path.join(CURRENT_DIR, "dip_engine")
PARENT_DIR = os.path.dirname(CURRENT_DIR)

for p in [CURRENT_DIR, NESTED_DIR, PARENT_DIR]:
    if p and os.path.exists(p) and p not in sys.path:
        sys.path.insert(0, p)

nested_pipeline_path = os.path.join(NESTED_DIR, "pipeline.py")
if os.path.exists(nested_pipeline_path):
    spec = importlib.util.spec_from_file_location("_nested_pipeline", nested_pipeline_path)
    _nested_mod = importlib.util.module_from_spec(spec)
    sys.modules["_nested_pipeline"] = _nested_mod
    spec.loader.exec_module(_nested_mod)
    for k in dir(_nested_mod):
        if not k.startswith("__"):
            globals()[k] = getattr(_nested_mod, k)
