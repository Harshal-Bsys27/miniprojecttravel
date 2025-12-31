from __future__ import annotations

import os
from datetime import timedelta


class Config:
    """App configuration.

    Reads from environment variables so deployments can be configured without
    editing source code.
    """

    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-only-change-me")

    # MongoEngine / pymongo connection.
    # Prefer a single URI in production.
    MONGODB_URI = os.environ.get("MONGODB_URI")
    MONGODB_DB = os.environ.get("MONGODB_DB", "letstravel_db")

    if MONGODB_URI:
        MONGODB_SETTINGS = {
            "db": MONGODB_DB,
            "host": MONGODB_URI,
        }
    else:
        MONGODB_SETTINGS = {
            "db": MONGODB_DB,
            "host": os.environ.get("MONGODB_HOST", "mongodb://localhost:27017/letstravel_db"),
        }

    # Flask session lifetime (cookie-based sessions by default).
    PERMANENT_SESSION_LIFETIME = timedelta(days=int(os.environ.get("SESSION_DAYS", "7")))

    # Helps when running behind a proxy (Render/Heroku/Nginx/etc.).
    PREFERRED_URL_SCHEME = os.environ.get("PREFERRED_URL_SCHEME", "https")

    # Security-ish defaults (can be overridden by env vars).
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = os.environ.get("SESSION_COOKIE_SAMESITE", "Lax")
    SESSION_COOKIE_SECURE = os.environ.get("SESSION_COOKIE_SECURE", "1") == "1"


class DevConfig(Config):
    SESSION_COOKIE_SECURE = False


class ProdConfig(Config):
    pass


def get_config() -> type[Config]:
    env = os.environ.get("FLASK_ENV", os.environ.get("ENV", "production")).lower()
    if env in {"dev", "development", "local"}:
        return DevConfig
    return ProdConfig
