"""Flask entrypoint.

This file stays for local development / compatibility.
Production servers should point at `wsgi:app`.
"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BACKEND = ROOT / "backend"
if BACKEND.is_dir():
    backend_str = str(BACKEND)
    if backend_str not in sys.path:
        sys.path.insert(0, backend_str)

from letstravel import create_app


app = create_app()


if __name__ == "__main__":
    app.run(debug=True)