"""WSGI entrypoint for production servers.

Examples:
- gunicorn wsgi:app
- waitress-serve --call wsgi:app
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
