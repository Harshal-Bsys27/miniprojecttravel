from __future__ import annotations

import os
import sys
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

# Load local env vars (COHERE_API_KEY should be in .env, not committed)
load_dotenv(dotenv_path=str(ROOT / ".env"))

from app import app  # noqa: E402  (app.py sets up sys.path for backend)


def main() -> None:
    payload = {
        "destination": "Mumbai",
        "duration": 3,
        "travelStyle": "budget",
        "interests": ["food", "culture"],
        "requirements": "veg preferred, include local transport tips",
    }

    with app.test_client() as client:
        resp = client.post("/api/itinerary", json=payload)
        print("status", resp.status_code)
        data = resp.get_json(silent=True) or {}
        if resp.status_code != 200:
            print("error", data.get("error"))
            return

        itinerary = data.get("itinerary") or ""
        print("itinerary_chars", len(itinerary))


if __name__ == "__main__":
    # Avoid printing secrets; just confirm presence.
    print("COHERE_API_KEY set:", bool(os.getenv("COHERE_API_KEY")))
    main()
