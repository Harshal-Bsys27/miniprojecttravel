from __future__ import annotations

# pyright: reportMissingImports=false

import sys
import re
from dataclasses import dataclass
from pathlib import Path

from werkzeug.security import generate_password_hash

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

# Importing app triggers app factory and registers routes
from app import app  # noqa: E402
from models.database import User  # noqa: E402


@dataclass(frozen=True)
class CheckResult:
    name: str
    status: int
    location: str | None = None


def _print_result(r: CheckResult) -> None:
    loc = f" -> {r.location}" if r.location else ""
    print(f"{r.name}: {r.status}{loc}")


def ensure_user(email: str, password: str) -> None:
    user = User.objects(email=email).first()
    if user:
        return

    User(
        username="smoketest",
        email=email,
        mobile="0000000000",
        password=generate_password_hash(password),
        original_password=password,
        is_admin=False,
    ).save()


def run() -> int:
    email = "smoketest@example.com"
    password = "test1234"

    ensure_user(email, password)

    client = app.test_client()

    login = client.post("/login", data={"email": email, "password": password}, follow_redirects=False)
    _print_result(CheckResult("login", login.status_code, login.headers.get("Location")))

    dashboard = client.get("/dashboard", follow_redirects=False)
    _print_result(CheckResult("dashboard", dashboard.status_code, dashboard.headers.get("Location")))

    packages = client.get("/packages", follow_redirects=False)
    _print_result(CheckResult("packages", packages.status_code, packages.headers.get("Location")))

    payment_entry = client.get("/payment.html?package=bronze", follow_redirects=False)
    _print_result(CheckResult("payment_entry", payment_entry.status_code, payment_entry.headers.get("Location")))

    checkout_url = payment_entry.headers.get("Location") or ""
    checkout = client.get(checkout_url, follow_redirects=False) if checkout_url else None
    if checkout is None:
        print("checkout: skipped (no redirect location)")
        return 1

    _print_result(CheckResult("checkout", checkout.status_code, checkout.headers.get("Location")))

    checkout_html = checkout.get_data(as_text=True)
    match = re.search(r'name="booking_id"\s+value="([^"]+)"', checkout_html)
    booking_id = match.group(1) if match else None
    print("booking_id:", booking_id)

    if not booking_id:
        print("confirm: skipped (no booking_id found in checkout HTML)")
        return 1

    confirm = client.post("/payment/confirm", data={"booking_id": booking_id}, follow_redirects=False)
    _print_result(CheckResult("confirm", confirm.status_code, confirm.headers.get("Location")))

    success_url = confirm.headers.get("Location")
    if not success_url:
        print("payment_success: skipped (no redirect location)")
        return 1

    success = client.get(success_url, follow_redirects=False)
    _print_result(CheckResult("payment_success", success.status_code, success.headers.get("Location")))

    # Ticket URL is derived from booking_id.
    ticket_url = f"/ticket/{booking_id}"

    ticket = client.get(ticket_url, follow_redirects=False)
    _print_result(CheckResult("ticket", ticket.status_code, ticket.headers.get("Location")))

    ticket_pdf_url = f"/ticket/{booking_id}/pdf"
    ticket_pdf = client.get(ticket_pdf_url, follow_redirects=False)
    _print_result(CheckResult("ticket_pdf", ticket_pdf.status_code, ticket_pdf.headers.get("Location")))

    # Legacy navbar links that appear across static pages
    legacy_urls = [
        "/index.html",
        "/templates/index.html",
        "/templates/login.html",
        "/templates/explore.html",
        "/templates/pakeges/pakeges.html?destination=goa&season=summer",
        "/Theme.js",
        "/css%20codes/trips.css",
    ]

    for url in legacy_urls:
        resp = client.get(url, follow_redirects=False)
        _print_result(CheckResult(f"legacy {url}", resp.status_code, resp.headers.get("Location")))

    return 0


if __name__ == "__main__":
    raise SystemExit(run())
