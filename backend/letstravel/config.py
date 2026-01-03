from __future__ import annotations

import os
from datetime import timedelta


def _env_bool(name: str, default: bool) -> bool:
    value = os.environ.get(name)
    if value is None:
        return default
    return str(value).strip().lower() in {"1", "true", "yes", "y", "on"}


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
    # Dev defaults to http; production defaults to https.
    PREFERRED_URL_SCHEME = os.environ.get("PREFERRED_URL_SCHEME", "http")

    # Security-ish defaults (can be overridden by env vars).
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = os.environ.get("SESSION_COOKIE_SAMESITE", "Lax")
    # IMPORTANT: secure cookies do not persist over plain http://localhost.
    # Keep dev-friendly default here; ProdConfig overrides to True.
    SESSION_COOKIE_SECURE = _env_bool("SESSION_COOKIE_SECURE", False)


class DevConfig(Config):
    SESSION_COOKIE_SECURE = _env_bool("SESSION_COOKIE_SECURE", False)
    PREFERRED_URL_SCHEME = os.environ.get("PREFERRED_URL_SCHEME", "http")


class ProdConfig(Config):
    SESSION_COOKIE_SECURE = _env_bool("SESSION_COOKIE_SECURE", True)
    PREFERRED_URL_SCHEME = os.environ.get("PREFERRED_URL_SCHEME", "https")


def get_config() -> type[Config]:
    env = os.environ.get("FLASK_ENV") or os.environ.get("ENV")
    if env is None or not str(env).strip():
        # If no env is set, assume local dev unless we detect a Render deployment.
        if os.environ.get("RENDER") or os.environ.get("RENDER_SERVICE_ID"):
            return ProdConfig
        return DevConfig

    env = str(env).strip().lower()
    if env in {"dev", "development", "local"}:
        return DevConfig
    return ProdConfig
