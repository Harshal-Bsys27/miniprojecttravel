"""Project bootstrap.

Python automatically imports `sitecustomize` (if present on sys.path) during
startup. We use it to ensure `backend/` is importable so existing imports like
`import letstravel` continue to work after separating frontend/backend.
"""

from __future__ import annotations

import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parent
_BACKEND = _ROOT / "backend"

if _BACKEND.is_dir():
    backend_str = str(_BACKEND)
    if backend_str not in sys.path:
        sys.path.insert(0, backend_str)
