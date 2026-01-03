# letstravel/extensions.py
from __future__ import annotations

import os
from flask import Flask, session
from mongoengine import connect
from flask_login import LoginManager, UserMixin

from models.database import User

# Flask-Login
login_manager = LoginManager()
login_manager.login_view = "auth.login"  # adjust if your login route is different


def _infer_db_from_mongo_uri(uri: str) -> str | None:
    """Infer db name from Atlas-style connection string.

    Examples:
    - mongodb+srv://...mongodb.net/letstravel?x=y -> letstravel
    - mongodb+srv://...mongodb.net/?x=y -> None
    """
    if not uri:
        return None
    try:
        tail = uri.split("mongodb.net/", 1)[1]
    except Exception:
        return None
    path = tail.split("?", 1)[0]
    path = path.lstrip("/").strip()
    if not path:
        return None
    return path.split("/", 1)[0] or None

def init_extensions(app: Flask):
    """Initialize DB connection using MongoEngine and other extensions."""
    
    # 1️⃣ MongoDB Atlas connection
    # Support both names: older deployments use MONGO_URI; config uses MONGODB_URI.
    mongo_uri = os.environ.get("MONGO_URI") or os.environ.get("MONGODB_URI")
    if mongo_uri:
        mongo_uri = mongo_uri.strip()
    
    if mongo_uri:
        # Connect using Atlas URI.
        # IMPORTANT: if URI omits /<db>, drivers default to "test".
        # We force an explicit DB name so the app always uses the intended database.
        inferred = _infer_db_from_mongo_uri(mongo_uri)
        db_name = inferred or os.environ.get("MONGODB_DB") or "letstravel"

        connect(db=db_name, host=mongo_uri, alias="default")
        app.logger.info("Connected to MongoDB Atlas (db=%s)", db_name)
    else:
        # Fallback to local dev
        settings = app.config.get("MONGODB_SETTINGS") or {}
        db_name = settings.get("db", "letstravel")
        host = settings.get("host", "localhost")
        connect(db=db_name, host=host, alias="default")
        app.logger.warning("Connected to local MongoDB")

    # 2️⃣ Initialize Flask-Login
    login_manager.init_app(app)

    # 2️⃣b Configure Flask-Login loaders
    # Render (and Flask in general) may evaluate `current_user` via template context processors
    # even on public pages. Flask-Login requires at least one loader to be registered.
    class _LoginUser(UserMixin):
        def __init__(self, user: User):
            self._user = user

        def get_id(self):
            # Flask-Login stores this in its own session key.
            return str(self._user.id)

        @property
        def is_admin(self):
            return bool(getattr(self._user, "is_admin", False))

        @property
        def username(self):
            return getattr(self._user, "username", "")

        @property
        def email(self):
            return getattr(self._user, "email", "")

        @property
        def user(self):
            return self._user

    def _wrap(user: User | None):
        return _LoginUser(user) if user else None

    @login_manager.user_loader
    def load_user(user_id: str):
        try:
            user = User.objects(id=user_id).first()
            return _wrap(user)
        except Exception:
            return None

    @login_manager.request_loader
    def load_user_from_request(_request):
        # The app uses Flask `session['user_id']` for auth. Bridge that to Flask-Login.
        user_id = session.get("user_id")
        if not user_id:
            return None
        return load_user(str(user_id))

    # 3️⃣ (Optional) Add other extensions here, e.g., Mail, Bootstrap, etc.
