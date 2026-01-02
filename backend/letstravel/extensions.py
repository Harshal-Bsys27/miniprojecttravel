# letstravel/extensions.py
from __future__ import annotations

import os
from flask import Flask
from mongoengine import connect
from flask_login import LoginManager

# Flask-Login
login_manager = LoginManager()
login_manager.login_view = "auth.login"  # adjust if your login route is different

def init_extensions(app: Flask):
    """Initialize DB connection using MongoEngine and other extensions."""
    
    # 1️⃣ MongoDB Atlas connection
    mongo_uri = os.environ.get("MONGO_URI")
    
    if mongo_uri:
        # Connect using Atlas URI
        connect(host=mongo_uri, alias="default")
        app.logger.info("Connected to MongoDB Atlas")
    else:
        # Fallback to local dev
        settings = app.config.get("MONGODB_SETTINGS") or {}
        db_name = settings.get("db", "letstravel")
        host = settings.get("host", "localhost")
        connect(db=db_name, host=host, alias="default")
        app.logger.warning("Connected to local MongoDB")

    # 2️⃣ Initialize Flask-Login
    login_manager.init_app(app)

    # 3️⃣ (Optional) Add other extensions here, e.g., Mail, Bootstrap, etc.
