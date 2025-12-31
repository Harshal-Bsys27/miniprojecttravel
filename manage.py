"""Utility CLI for local maintenance tasks.

This replaces the old root-level scripts like `setup_admin.py`, `check_db.py`,
`create_indexes.py`, etc.

Examples:
- python manage.py setup-admin
- python manage.py clear-admin
- python manage.py create-indexes
- python manage.py seed-tours
- python manage.py check-users
- python manage.py summary
"""

from __future__ import annotations

import argparse
from dataclasses import dataclass
from datetime import datetime, timezone


def _connect() -> None:
    # Ensure backend/ is importable (sitecustomize normally handles this).
    from pathlib import Path
    import sys

    root = Path(__file__).resolve().parent
    backend = root / "backend"
    if backend.is_dir():
        backend_str = str(backend)
        if backend_str not in sys.path:
            sys.path.insert(0, backend_str)

    from letstravel import create_app

    # Creating the app initializes MongoEngine connection.
    create_app()


@dataclass
class SeedTour:
    name: str
    description: str
    price: float
    duration: int
    category: str
    location: str
    image_url: str
    featured: bool = True


def cmd_setup_admin(_args: argparse.Namespace) -> int:
    _connect()

    from werkzeug.security import generate_password_hash
    from models.database import User

    email = "admin@letstravel.com"
    password = "admin123"

    if User.objects(email=email).first():
        print("Admin already exists")
        return 0

    User(
        username="admin",
        email=email,
        mobile="0000000000",
        password=generate_password_hash(password),
        is_admin=True,
        created_at=datetime.now(timezone.utc),
    ).save()

    print("Admin created successfully!")
    print(f"Email: {email}")
    print(f"Password: {password}")
    return 0


def cmd_reset_admin_password(args: argparse.Namespace) -> int:
    """Reset an existing admin user's password (or create the admin if missing)."""
    _connect()

    from werkzeug.security import generate_password_hash
    from models.database import User

    email = (args.email or "admin@letstravel.com").strip()
    username = (args.username or "admin").strip()
    password = (args.password or "admin123").strip()

    if not password:
        raise SystemExit("Password cannot be empty")

    user = None
    if email:
        user = User.objects(email=email).first()
    if not user and username:
        user = User.objects(username=username).first()

    if not user:
        # Create admin if it doesn't exist.
        user = User(
            username=username or "admin",
            email=email or "admin@letstravel.com",
            mobile="0000000000",
            is_admin=True,
            created_at=datetime.now(timezone.utc),
        )

    user.password = generate_password_hash(password)
    user.is_admin = True
    user.save()

    print("Admin password reset successfully!")
    print(f"Email: {user.email}")
    print(f"Username: {user.username}")
    print(f"Password: {password}")
    return 0


def cmd_clear_admin(_args: argparse.Namespace) -> int:
    _connect()

    from models.database import User

    deleted = User.objects(is_admin=True).delete()
    print(f"Cleared admin users (deleted={deleted})")
    return 0


def cmd_create_indexes(_args: argparse.Namespace) -> int:
    _connect()

    from models.database import Booking, Tour, User

    User.ensure_indexes()
    Tour.ensure_indexes()
    Booking.ensure_indexes()

    print("Indexes created successfully!")
    return 0


def cmd_seed_tours(_args: argparse.Namespace) -> int:
    _connect()

    from models.database import Tour

    sample_tours = [
        SeedTour(
            name="Udaipur Palace Tour",
            description="Experience the royal heritage of Udaipur",
            price=15999.99,
            duration=4,
            category="Cultural",
            location="Udaipur",
            image_url="/images.png/vacation.udaipur.jpg",
        ),
        SeedTour(
            name="Mysore Heritage Tour",
            description="Discover the grandeur of Mysore Palace",
            price=12499.99,
            duration=3,
            category="Cultural",
            location="Mysore",
            image_url="/images.png/vacation.Mysore.jpg",
        ),
        SeedTour(
            name="Maharashtra Adventure",
            description="Explore forts and hillstations",
            price=18999.99,
            duration=5,
            category="Adventure",
            location="Maharashtra",
            image_url="/images.png/book.Mahrashtra.jpg",
        ),
        SeedTour(
            name="Andaman Beach Paradise",
            description="Crystal clear waters and pristine beaches",
            price=24999.99,
            duration=6,
            category="Beach",
            location="Andaman & Nicobar",
            image_url="/images.png/vacation.Andaman & Nicobar.jpg",
        ),
    ]

    created = 0
    updated = 0

    for item in sample_tours:
        existing = Tour.objects(name=item.name).first()
        if existing:
            # Only fill missing fields to avoid overwriting custom edits.
            dirty = False
            for field in [
                "description",
                "price",
                "duration",
                "category",
                "location",
                "image_url",
                "featured",
            ]:
                current = getattr(existing, field, None)
                new_value = getattr(item, field)
                if current in (None, "") and new_value not in (None, ""):
                    setattr(existing, field, new_value)
                    dirty = True
            if dirty:
                existing.save()
                updated += 1
            continue

        Tour(
            name=item.name,
            description=item.description,
            price=item.price,
            duration=item.duration,
            category=item.category,
            location=item.location,
            image_url=item.image_url,
            featured=item.featured,
            created_at=datetime.now(timezone.utc),
        ).save()
        created += 1

    print(f"Seed complete: created={created}, updated={updated}")
    return 0


def cmd_check_users(_args: argparse.Namespace) -> int:
    _connect()

    from models.database import User

    users = list(User.objects())
    if not users:
        print("No users found")
        return 0

    print(f"Users found: {len(users)}")
    for user in users[:50]:
        print(f"- {user.username} | {user.email} | admin={bool(user.is_admin)}")

    if len(users) > 50:
        print("(truncated; showing first 50)")
    return 0


def cmd_summary(_args: argparse.Namespace) -> int:
    _connect()

    from models.database import Booking, Tour, User

    user_count = User.objects.count()
    tour_count = Tour.objects.count()
    booking_count = Booking.objects.count()
    paid_count = Booking.objects(status="paid").count()

    print("DB summary")
    print(f"- users:   {user_count}")
    print(f"- tours:   {tour_count}")
    print(f"- bookings:{booking_count} (paid={paid_count})")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="manage.py")
    sub = parser.add_subparsers(dest="cmd", required=True)

    sub.add_parser("setup-admin", help="Create default admin user").set_defaults(func=cmd_setup_admin)
    reset = sub.add_parser("reset-admin-password", help="Reset admin password (or create admin)")
    reset.add_argument("--email", default="admin@letstravel.com", help="Admin email to target")
    reset.add_argument("--username", default="admin", help="Admin username to target")
    reset.add_argument("--password", required=False, help="New password (default: admin123)")
    reset.set_defaults(func=cmd_reset_admin_password)
    sub.add_parser("clear-admin", help="Delete admin users").set_defaults(func=cmd_clear_admin)
    sub.add_parser("create-indexes", help="Create MongoDB indexes").set_defaults(func=cmd_create_indexes)
    sub.add_parser("seed-tours", help="Insert sample tours if missing").set_defaults(func=cmd_seed_tours)
    sub.add_parser("check-users", help="Print basic user list").set_defaults(func=cmd_check_users)
    sub.add_parser("summary", help="Print DB object counts").set_defaults(func=cmd_summary)

    args = parser.parse_args(argv)
    return int(args.func(args))


if __name__ == "__main__":
    raise SystemExit(main())
