from __future__ import annotations

from io import BytesIO

import pandas as pd
from flask import Blueprint, flash, redirect, render_template, send_file, session, url_for
from werkzeug.security import generate_password_hash

from letstravel.routes.auth import admin_required
from models.database import Booking, Tour, User
from models.user_activity import UserActivity


admin_bp = Blueprint("admin", __name__)


@admin_bp.route("/admin/export/<data_type>")
@admin_required
def export_data(data_type: str):
    try:
        if data_type == "users":
            data = User.objects().only("username", "email", "mobile", "login_count", "created_at")
            df = pd.DataFrame(list(data.as_pymongo()))
        elif data_type == "bookings":
            data = Booking.objects()
            df = pd.DataFrame(list(data.as_pymongo()))
        elif data_type == "tours":
            data = Tour.objects()
            df = pd.DataFrame(list(data.as_pymongo()))
        else:
            return "Invalid data type", 400

        output = BytesIO()
        with pd.ExcelWriter(output, engine="xlsxwriter") as writer:
            sheet_name = data_type.capitalize()
            df.to_excel(writer, sheet_name=sheet_name, index=False)

            worksheet = writer.sheets[sheet_name]
            for idx, col in enumerate(df.columns):
                series = df[col]
                max_len = max(series.astype(str).map(len).max(), len(str(col))) + 2
                worksheet.set_column(idx, idx, max_len)

        output.seek(0)
        return send_file(
            output,
            mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            as_attachment=True,
            download_name=f"{data_type}_export.xlsx",
        )

    except Exception as e:
        print(f"Export error: {e}")
        flash("Export failed")
        return redirect(url_for("admin.admin_dashboard"))


@admin_bp.route("/admin/dashboard")
@admin_required
def admin_dashboard():
    try:
        from datetime import datetime, timezone

        show_welcome = session.pop("show_admin_welcome", False)

        users = (
            User.objects()
            .only(
                "username",
                "email",
                "mobile",
                "created_at",
                "last_login",
                "login_count",
                "active_sessions",
                "total_session_duration",
            )
            .order_by("-created_at")
        )

        try:
            tours = Tour.objects().order_by("-created_at")
        except Exception as e:
            print(f"Error fetching tours: {e}")
            tours = []

        try:
            bookings = Booking.objects().order_by("-created_at")
        except Exception as e:
            print(f"Error fetching bookings: {e}")
            bookings = []

        stats = {
            "total_users": User.objects().count(),
            "total_tours": Tour.objects().count(),
            "total_bookings": Booking.objects().count(),
            "active_users": User.objects(active_sessions__gt=0).count(),
            "revenue": sum((getattr(b, "amount", 0) or 0) for b in bookings),
            "recent_activities": [],
        }

        # User activity stats (page views + searches + bookings)
        try:
            user_activities = list(UserActivity.objects().order_by("-updated_at")[:50])
        except Exception as e:
            print(f"Error fetching user activities: {e}")
            user_activities = []

        total_activity_events = 0
        for activity in user_activities:
            total_activity_events += len(getattr(activity, "page_views", []) or [])
            total_activity_events += len(getattr(activity, "search_history", []) or [])
            total_activity_events += len(getattr(activity, "bookings", []) or [])

        stats["total_activities"] = total_activity_events

        # Fill in missing emails (template expects activity.email)
        missing_email_ids = [a.user_id for a in user_activities if not getattr(a, "email", None) and getattr(a, "user_id", None)]
        user_email_by_id: dict[str, str] = {}
        if missing_email_ids:
            try:
                for u in User.objects(id__in=missing_email_ids).only("email"):
                    user_email_by_id[str(u.id)] = u.email
            except Exception as e:
                print(f"Error mapping user emails for activities: {e}")

        for activity in user_activities:
            if not getattr(activity, "email", None):
                fallback = user_email_by_id.get(str(activity.user_id))
                if fallback:
                    activity.email = fallback

        print("Admin Dashboard Data Loaded:")
        print(f"Users count: {stats['total_users']}")
        print(f"Tours count: {stats['total_tours']}")
        print(f"Bookings count: {stats['total_bookings']}")

        return render_template(
            "admin/admin_dashboard.html",
            users=users[:10],
            tours=tours[:10] if tours else [],
            bookings=bookings[:10] if bookings else [],
            user_activities=user_activities,
            stats=stats,
            admin_name=session.get("username"),
            show_welcome=show_welcome,
        )

    except Exception as e:
        print(f"Admin dashboard error: {str(e)}")
        flash(f"Error loading dashboard: {str(e)}")
        return redirect(url_for("auth.login"))


@admin_bp.route("/create_admin", methods=["GET", "POST"])
def create_admin():
    try:
        from datetime import datetime, timezone

        existing_admin = User.objects(is_admin=True).first()
        if existing_admin:
            print("Admin already exists:", existing_admin.email)
            return "Admin already exists"

        password = "admin123"
        hashed_password = generate_password_hash(password)

        admin = User(
            username="admin",
            email="admin@letstravel.com",
            mobile="0000000000",
            password=hashed_password,
            is_admin=True,
            created_at=datetime.now(timezone.utc),
            last_login=datetime.now(timezone.utc),
            login_count=0,
            active_sessions=0,
            total_session_duration=0,
        )

        admin.save()
        print("Admin created successfully")
        return "Admin created successfully. You can now login with admin@letstravel.com / admin123"

    except Exception as e:
        print(f"Error creating admin: {str(e)}")
        return f"Failed to create admin: {str(e)}"
