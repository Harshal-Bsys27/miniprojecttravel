from __future__ import annotations

from datetime import datetime, timezone
from functools import wraps

from flask import Blueprint, flash, redirect, render_template, request, session, url_for
from werkzeug.security import check_password_hash, generate_password_hash

from models.database import User


auth_bp = Blueprint("auth", __name__)


def login_required(fn):
    @wraps(fn)
    def decorated(*args, **kwargs):
        if "user_id" not in session:
            return redirect(url_for("auth.login"))
        return fn(*args, **kwargs)

    return decorated


def admin_required(fn):
    @wraps(fn)
    def decorated(*args, **kwargs):
        if "user_id" not in session:
            return redirect(url_for("auth.login", admin=1))

        user = User.objects(id=session["user_id"]).first()
        if not user or not user.is_admin:
            flash("Access denied. Admin privileges required.")
            return redirect(url_for("main.dashboard"))

        return fn(*args, **kwargs)

    return decorated


@auth_bp.route("/", methods=["GET"])
def index():
    # Proper UX: unauthenticated users should land on login.
    if "user_id" not in session:
        return redirect(url_for("auth.login"))
    return redirect(url_for("main.dashboard"))


@auth_bp.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "POST":
        try:
            email = (request.form.get("email") or "").strip()
            username = (request.form.get("username") or "").strip()

            existing_email = User.objects(email__iexact=email).first() if email else None
            if existing_email:
                flash("Email already registered")
                return render_template("auth/register.html")

            existing_username = User.objects(username__iexact=username).first() if username else None
            if existing_username:
                flash("Username already taken")
                return render_template("auth/register.html")

            password = request.form.get("password")
            new_user = User(
                username=username,
                email=email,
                mobile=request.form.get("mobile"),
                password=generate_password_hash(password),
                created_at=datetime.now(timezone.utc),
            )
            new_user.save()

            # Improve UX: prefill the login identifier after successful registration.
            session["prefill_login_identifier"] = email

            flash("Registration successful! Please login.")
            return render_template(
                "auth/loader.html",
                message="Registration successful! Redirecting to login...",
                redirect_url=url_for("auth.login", prefill=email),
                delay=3000,
            )
        except Exception as e:
            flash("Registration failed. Please try again.")
            # Keep debug print behavior
            print(f"Database error: {e}")

    return render_template("auth/register.html")


@auth_bp.route("/login", methods=["GET", "POST"])
def login():
    prefill_identifier = (request.args.get("prefill") or session.pop("prefill_login_identifier", "") or "").strip()
    admin_login_context = bool(request.args.get("admin"))

    # If the login page is prefilled with the default admin email, keep admin UI.
    if prefill_identifier.lower() == "admin@letstravel.com":
        admin_login_context = True

    if request.method == "POST":
        try:
            identifier = (request.form.get("identifier") or request.form.get("email") or "").strip()
            password = request.form.get("password")
            admin_login_context = admin_login_context or (request.form.get("admin_login") == "1")

            user = None
            if identifier:
                user = User.objects(email__iexact=identifier).first()
                if not user:
                    user = User.objects(username__iexact=identifier).first()

            print(f"Login attempt for identifier: {identifier}")

            if user:
                print(f"User found, is_admin: {user.is_admin}")
                admin_login_context = admin_login_context or bool(user.is_admin)

                # Admin must login using email (not username) for clarity + policy.
                if user.is_admin and identifier.lower() != (user.email or "").lower():
                    flash("Admin must login using email and password")
                    return render_template(
                        "auth/login.html",
                        error="Admin must login using email and password",
                        prefill_identifier=prefill_identifier or identifier,
                        admin_login=admin_login_context,
                    )

                if check_password_hash(user.password, password):
                    session["user_id"] = str(user.id)
                    session["username"] = user.username
                    session["is_admin"] = user.is_admin
                    session["login_time"] = int(datetime.now(timezone.utc).timestamp())
                    session["show_admin_welcome"] = user.is_admin

                    User.objects(id=user.id).update_one(
                        inc__login_count=1,
                        inc__active_sessions=1,
                        set__last_login=datetime.now(timezone.utc),
                    )

                    if user.is_admin:
                        return redirect(url_for("admin.admin_dashboard"))

                    return render_template(
                        "auth/loader.html",
                        message="Your journey begins here...",
                        redirect_url=url_for("main.dashboard"),
                        delay=2000,
                    )
                else:
                    print("Password verification failed")

            flash("Invalid email or password")
            return render_template(
                "auth/login.html",
                error="Invalid email/username or password",
                prefill_identifier=prefill_identifier or identifier,
                admin_login=admin_login_context,
            )

        except Exception as e:
            print(f"Login error: {e}")
            flash("Login failed. Please try again.")

    return render_template("auth/login.html", prefill_identifier=prefill_identifier, admin_login=admin_login_context)


@auth_bp.route("/logout")
def logout():
    if "user_id" in session and "login_time" in session:
        try:
            user_id = session["user_id"]
            login_time = session.get("login_time")

            current_time = int(datetime.now(timezone.utc).timestamp())
            duration = int((current_time - login_time) / 60)
            print(f"Session duration: {duration} minutes")

            user = User.objects(id=user_id).only("active_sessions").first()
            if user:
                new_active_sessions = max((user.active_sessions or 0) - 1, 0)
                updates = {"set__active_sessions": new_active_sessions}
                if duration > 0:
                    updates["inc__total_session_duration"] = duration

                User.objects(id=user_id).update_one(**updates)
                if duration > 0:
                    print(f"Updated session duration for user {user_id}: +{duration} minutes")

        except Exception as e:
            print(f"Error updating session stats: {e}")

    session.clear()
    return redirect(url_for("auth.login"))
