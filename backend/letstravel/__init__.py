from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, render_template, request, session
from werkzeug.middleware.proxy_fix import ProxyFix

from letstravel.config import get_config
from letstravel.extensions import init_extensions
from letstravel.routes.admin import admin_bp
from letstravel.routes.auth import auth_bp
from letstravel.routes.main import main_bp
from letstravel.routes.public import public_bp


def create_app() -> Flask:
    # Load .env if present (local dev). Production should use real env vars.
    load_dotenv()

    here = Path(__file__).resolve()
    project_root = None
    for candidate in [here.parent] + list(here.parents):
        if (candidate / "templates").is_dir() and (candidate / "static").is_dir():
            project_root = candidate
            break
    if project_root is None:
        project_root = here.parents[1]

    app = Flask(
        __name__,
        template_folder=str(project_root / "templates"),
        static_folder=str(project_root / "static"),
        static_url_path="/static",
    )
    app.config.from_object(get_config())

    # Respect X-Forwarded-* headers (common in production behind proxies).
    # x_prefix helps when app is mounted under a sub-path.
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_port=1, x_prefix=1)

    # Initialize DB (MongoEngine)
    init_extensions(app)

    # Blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(main_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(public_bp)

    @app.before_request
    def _track_user_activity():
        # Keep behavior equivalent to existing app, but don't track static assets.
        if "user_id" not in session:
            return

        path = request.path
        static_prefixes = (
            "/static/",
            "/images.png/",
            "/allcodeshtml/",
            "/dedicated destinations/",
            "/dedicated-destinations/",
            "/learnmoreholidays/",
            "/Blog/",
            "/css codes/",
            "/css/",
            "/js/",
            "/js code/",
            "/styles/",
        )
        if any(path.startswith(prefix) for prefix in static_prefixes):
            return

        # Import here to avoid circular imports
        from datetime import datetime, timezone
        from models.user_activity import PageView, UserActivity

        page_view = PageView(page=path, timestamp=datetime.now(timezone.utc))
        UserActivity.objects(user_id=session["user_id"]).update_one(
            push__page_views=page_view,
            set__updated_at=datetime.now(timezone.utc),
            upsert=True,
        )

    @app.errorhandler(404)
    def _not_found_error(_error):
        return render_template("auth/login.html", error="The page you're looking for doesn't exist."), 404

    @app.errorhandler(500)
    def _internal_error(_error):
        return render_template("auth/login.html", error="Something went wrong! Please try again later."), 500

    # Small production sanity check
    if os.environ.get("FLASK_ENV") in {"production", "prod"}:
        if app.config.get("SECRET_KEY") in {None, "", "dev-only-change-me"}:
            # Don't hard-fail deployments, but make it obvious in logs.
            app.logger.warning("SECRET_KEY is not set; set SECRET_KEY env var in production")

    return app
