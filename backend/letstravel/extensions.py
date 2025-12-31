from __future__ import annotations

from flask import Flask
from mongoengine import connect


def init_extensions(app: Flask):
    """Initialize DB connection.

    Uses MongoEngine directly (works with Flask 3.x).
    """

    settings = app.config.get("MONGODB_SETTINGS") or {}
    db_name = settings.get("db")
    host = settings.get("host")

    if not db_name or not host:
        raise RuntimeError("MONGODB_SETTINGS must include 'db' and 'host'")

    # Establish the default connection.
    connect(db=db_name, host=host, alias="default")
