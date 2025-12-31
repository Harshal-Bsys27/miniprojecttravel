from __future__ import annotations

import os
from pathlib import Path
import re
import html as _html

from datetime import datetime, timedelta, timezone

from flask import Blueprint, abort, jsonify, redirect, render_template, request, send_from_directory, session, url_for


public_bp = Blueprint("public", __name__)


here = Path(__file__).resolve()
_WORKSPACE_ROOT = None
for candidate in [here.parent] + list(here.parents):
    if (candidate / "templates").is_dir() and (candidate / "static").is_dir():
        _WORKSPACE_ROOT = candidate
        break
if _WORKSPACE_ROOT is None:
    _WORKSPACE_ROOT = here.parents[3]

_STATIC_ROOT = _WORKSPACE_ROOT / "static"
_TEMPLATES_ROOT = _WORKSPACE_ROOT / "templates"


_SITE_PAGES_CACHE: list[dict[str, str]] | None = None


_SCRIPT_STYLE_RE = re.compile(r"<(script|style)\\b[^>]*>.*?</\\1>", re.IGNORECASE | re.DOTALL)
_TAG_RE = re.compile(r"<[^>]+>")
_WS_RE = re.compile(r"\\s+")


def _normalize_text(text: str) -> str:
    if not text:
        return ""
    text = _html.unescape(text)
    text = _WS_RE.sub(" ", text)
    return text.strip().lower()


def _extract_html_title_from_text(html_text: str, fallback: str) -> str:
    head = (html_text or "")[:8192]
    match = re.search(r"<title>(.*?)</title>", head, flags=re.IGNORECASE | re.DOTALL)
    if match:
        title = _TAG_RE.sub(" ", match.group(1))
        title = _WS_RE.sub(" ", _html.unescape(title)).strip()
        if title:
            return title
    return fallback


def _extract_visible_text_from_html(html_text: str, max_chars: int = 200_000) -> str:
    if not html_text:
        return ""
    cleaned = _SCRIPT_STYLE_RE.sub(" ", html_text)
    cleaned = _TAG_RE.sub(" ", cleaned)
    cleaned = _WS_RE.sub(" ", _html.unescape(cleaned)).strip()
    if len(cleaned) <= max_chars:
        return cleaned

    # Keep both start and end so keywords late in file can still match.
    half = max_chars // 2
    return f"{cleaned[:half]} {cleaned[-half:]}"


def _extract_html_title(path: Path) -> str:
    try:
        # Read only a small prefix; titles are at the top.
        head = path.read_text(encoding="utf-8", errors="ignore")[:8192]
        match = re.search(r"<title>(.*?)</title>", head, flags=re.IGNORECASE | re.DOTALL)
        if match:
            title = re.sub(r"\s+", " ", match.group(1)).strip()
            if title:
                return title
    except Exception:
        pass
    return path.stem.replace("_", " ").strip() or path.name


def _build_site_pages_index() -> list[dict[str, str]]:
    sources: list[tuple[str, Path, str]] = [
        ("All Codes", _TEMPLATES_ROOT / "allcodeshtml", "/allcodeshtml"),
        ("Learn More", _TEMPLATES_ROOT / "learnmoreholidays", "/learnmoreholidays"),
        ("FirstFlight", _TEMPLATES_ROOT / "firstflight-travels-main", "/firstflight-travels-main"),
        ("Destinations", _TEMPLATES_ROOT / "dedicated destinations", "/dedicated destinations"),
        ("Destinations", _TEMPLATES_ROOT / "dedicated-destinations", "/dedicated-destinations"),
        ("Blog", _TEMPLATES_ROOT / "Blog", "/Blog"),
    ]

    pages: list[dict[str, str]] = []
    for kind, folder, url_prefix in sources:
        if not folder.is_dir():
            continue

        for path in folder.rglob("*.html"):
            try:
                rel = path.relative_to(folder).as_posix()
            except Exception:
                continue

            url = f"{url_prefix}/{rel}"
            try:
                html_text = path.read_text(encoding="utf-8", errors="ignore")
            except Exception:
                html_text = ""

            title = _extract_html_title_from_text(
                html_text,
                fallback=path.stem.replace("_", " ").strip() or path.name,
            )
            visible = _extract_visible_text_from_html(html_text)
            search_blob = _normalize_text(f"{title} {path.stem} {url} {visible}")
            pages.append({"title": title, "url": url, "kind": kind, "_search": search_blob})

    # Remove obvious duplicates by URL.
    seen: set[str] = set()
    unique: list[dict[str, str]] = []
    for p in pages:
        if p["url"] in seen:
            continue
        seen.add(p["url"])
        unique.append(p)
    return unique


def _get_site_pages_index() -> list[dict[str, str]]:
    global _SITE_PAGES_CACHE
    if _SITE_PAGES_CACHE is None:
        _SITE_PAGES_CACHE = _build_site_pages_index()
    elif _SITE_PAGES_CACHE and "_search" not in _SITE_PAGES_CACHE[0]:
        # Hot-reload friendliness: if the cache was built by an older version
        # of this code, rebuild it so content-based search works immediately.
        _SITE_PAGES_CACHE = _build_site_pages_index()
    return _SITE_PAGES_CACHE


@public_bp.route("/site-search")
def site_search():
    q = (request.args.get("q") or "").strip()
    if not q:
        return jsonify([])

    try:
        limit = int(request.args.get("limit") or 10)
    except Exception:
        limit = 10

    limit = max(1, min(limit, 15))
    qn = _normalize_text(q)

    def score(page: dict[str, str]) -> int:
        hay = page.get("_search") or ""
        idx = hay.find(qn)
        if idx >= 0:
            return idx
        return 10_000

    matches: list[tuple[int, dict[str, str]]] = []
    for page in _get_site_pages_index():
        s = score(page)
        if s < 10_000:
            matches.append((s, page))

    matches.sort(key=lambda x: (x[0], x[1].get("title", "")))

    results: list[dict[str, str]] = []
    for _, page in matches[:limit]:
        label = page.get("title") or page.get("url")
        kind = page.get("kind") or "Page"
        results.append({"label": label, "url": page.get("url", "#"), "kind": kind})

    return jsonify(results)


def _safe_send(directory: Path, filename: str):
    # Basic traversal protection
    if ".." in filename.replace("\\", "/").split("/"):
        abort(404)

    if not directory.exists() or not directory.is_dir():
        abort(404)

    return send_from_directory(str(directory), filename)


# Serve existing static folders at the URLs already used in HTML.
@public_bp.route("/images.png/<path:filename>")
def images(filename: str):
    # Legacy path used across many pages.
    return _safe_send(_STATIC_ROOT / "images", filename)


@public_bp.route("/allcodeshtml/<path:filename>")
def allcodeshtml(filename: str):
    return _safe_send(_TEMPLATES_ROOT / "allcodeshtml", filename)


@public_bp.route("/dedicated destinations/<path:filename>")
def dedicated_destinations(filename: str):
    return _safe_send(_TEMPLATES_ROOT / "dedicated destinations", filename)


@public_bp.route("/firstflight-travels-main/<path:filename>")
def firstflight_travels_main(filename: str):
    # HTML pages were moved under templates/, assets under static/.
    if filename.lower().endswith(".html"):
        return _safe_send(_TEMPLATES_ROOT / "firstflight-travels-main", filename)
    return _safe_send(_STATIC_ROOT / "firstflight-travels-main", filename)


@public_bp.route("/dedicated-destinations/<path:filename>")
def dedicated_destinations_dash(filename: str):
    return _safe_send(_TEMPLATES_ROOT / "dedicated-destinations", filename)


@public_bp.route("/learnmoreholidays/<path:filename>")
def learnmoreholidays(filename: str):
    return _safe_send(_TEMPLATES_ROOT / "learnmoreholidays", filename)


@public_bp.route("/Blog/<path:filename>")
def blog(filename: str):
    return _safe_send(_TEMPLATES_ROOT / "Blog", filename)


@public_bp.route("/css codes/<path:filename>")
def css_codes(filename: str):
    # Legacy path used by older HTML.
    return _safe_send(_STATIC_ROOT / "css", filename)


@public_bp.route("/css/<path:filename>")
def css(filename: str):
    # Keep /css/* URLs working, but serve from the canonical static/css folder.
    return _safe_send(_STATIC_ROOT / "css", filename)


@public_bp.route("/js/<path:filename>")
def js(filename: str):
    # Keep /js/* URLs working, but serve from the canonical static/js folder.
    return _safe_send(_STATIC_ROOT / "js", filename)


@public_bp.route("/js code/<path:filename>")
def js_code(filename: str):
    return _safe_send(_STATIC_ROOT / "js", filename)


@public_bp.route("/styles/<path:filename>")
def styles(filename: str):
    # Older pages sometimes reference /styles/*. Treat it as an alias to static/css.
    return _safe_send(_STATIC_ROOT / "css", filename)


# A couple of root-level loose files that are linked directly.
@public_bp.route("/maps.css")
def maps_css():
    return _safe_send(_STATIC_ROOT / "legacy", "maps.css")


@public_bp.route("/maps.js")
def maps_js():
    return _safe_send(_STATIC_ROOT / "legacy", "maps.js")


@public_bp.route("/mapa.html")
def mapa_html():
    return _safe_send(_TEMPLATES_ROOT / "legacy", "mapa.html")


@public_bp.route("/Theme.js")
def theme_js():
    # Legacy theme toggler referenced by many static pages.
    # Prefer the copy under static/ if present, else fall back to the root file.
    if (_STATIC_ROOT / "js" / "Theme.js").is_file():
        return _safe_send(_STATIC_ROOT / "js", "Theme.js")
    return _safe_send(_WORKSPACE_ROOT, "Theme.js")


@public_bp.route("/templates/pakeges/pakeges.html")
def legacy_pakeges_template():
    # Old pages link to this misspelled path; redirect to the new packages page.
    return redirect(url_for("main.packages", **request.args.to_dict(flat=True)))


@public_bp.route("/index.html")
def legacy_index_html():
    # Many pages link to /index.html directly.
    return redirect(url_for("auth.index"))


@public_bp.route("/templates/<path:filename>")
def legacy_templates_root_files(filename: str):
    # Legacy pages often link to /templates/index.html, /templates/login.html, etc.
    # Only allow single-level filenames (no directory traversal or nested paths).
    if "/" in filename.replace("\\", "/"):
        abort(404)

    normalized = filename.strip().lower()
    if normalized in {"index.html", "home.html"}:
        return redirect(url_for("auth.index"))
    if normalized in {"login.html", "signin.html"}:
        return redirect(url_for("auth.login"))
    if normalized in {"register.html", "signup.html", "sign-up.html"}:
        return redirect(url_for("auth.register"))
    if normalized == "explore.html":
        return redirect("/firstflight-travels-main/explore.html")

    abort(404)


@public_bp.route("/payment.html")
def payment_html():
    # Legacy entrypoint from packages page.
    if "user_id" not in session:
        return redirect(url_for("auth.login"))

    package = (request.args.get("package") or "").strip().lower()
    if not package:
        # If opened directly, show the checkout template (no booking context).
        return render_template("payment/checkout.html")

    from models.database import Booking, Tour, User

    package_prices = {
        "bronze": 9999,
        "silver": 19999,
        "gold": 29999,
        "platinum": 39999,
    }
    amount = float(package_prices.get(package, 14999))

    destination = (request.args.get("destination") or request.args.get("to") or request.args.get("location") or "").strip()
    origin = (request.args.get("origin") or request.args.get("from") or "").strip()

    package_images = {
        "bronze": "/firstflight-travels-main/files/p1.jpg",
        "silver": "/firstflight-travels-main/files/p2.jpg",
        "gold": "/firstflight-travels-main/files/p3.jpg",
        "platinum": "/firstflight-travels-main/files/p4.jpg",
    }

    tour_name = f"{package.title()} Package"
    tour = Tour.objects(name=tour_name).first()
    if not tour:
        tour = Tour(
            name=tour_name,
            description=f"{package.title()} travel package",
            price=amount,
            duration=7,
            category="Package",
            location=(destination or "India"),
            image_url=package_images.get(package, "/static/images/image.png"),
            featured=False,
        ).save()
    else:
        # Keep existing tours valid and improve defaults if empty.
        dirty = False
        if destination and not (getattr(tour, "location", "") or "").strip():
            tour.location = destination
            dirty = True
        if not (getattr(tour, "image_url", "") or "").strip():
            tour.image_url = package_images.get(package, "/static/images/image.png")
            dirty = True
        if dirty:
            tour.save()

    user = User.objects(id=session["user_id"]).first()
    if not user:
        return redirect(url_for("auth.login"))

    # If user didn't choose a date, default to 7 days from today.
    travel_date_str = request.args.get("travel_date")
    if travel_date_str:
        try:
            travel_date = datetime.strptime(travel_date_str, "%Y-%m-%d")
        except Exception:
            travel_date = datetime.now(timezone.utc) + timedelta(days=7)
    else:
        travel_date = datetime.now(timezone.utc) + timedelta(days=7)

    booking = Booking(
        user=user,
        tour=tour,
        travel_date=travel_date,
        amount=amount,
        status="pending",
        journey_origin=(origin or None),
        journey_destination=(destination or None),
    ).save()
    return redirect(url_for("main.checkout", booking_id=str(booking.id)))


@public_bp.route("/payment.css")
def payment_css():
    return _safe_send(_STATIC_ROOT / "css", "payment.css")


@public_bp.route("/payment.js")
def payment_js():
    return _safe_send(_STATIC_ROOT / "js", "payment.js")


@public_bp.route("/payment-success.html")
def payment_success_html():
    if "user_id" not in session:
        return redirect(url_for("auth.login"))

    booking_id = (request.args.get("booking_id") or "").strip()
    if not booking_id:
        # If opened directly, still show a success page but without ticket link.
        return render_template(
            "payment/payment_success.html",
            booking_ref="",
            ticket_url=url_for("main.dashboard"),
            ticket_pdf_url="",
        )

    # Ticket route enforces ownership; we only use booking_id to build a link.
    return render_template(
        "payment/payment_success.html",
        booking_ref=f"LT-{booking_id[-8:].upper()}",
        ticket_url=url_for("main.ticket", booking_id=booking_id),
        ticket_pdf_url=url_for("main.ticket_pdf", booking_id=booking_id),
    )


@public_bp.route("/success.html")
def success_html():
    return _safe_send(_TEMPLATES_ROOT / "legacy", "success.html")


@public_bp.route("/success.js")
def success_js():
    return _safe_send(_STATIC_ROOT / "js", "success.js")


@public_bp.route("/footer.css")
def footer_css():
    return _safe_send(_STATIC_ROOT / "legacy", "footer.css")


@public_bp.route("/CONFIG.JS")
def config_js_legacy():
    return _safe_send(_STATIC_ROOT / "legacy", "CONFIG.JS")


@public_bp.route("/Pack.html")
def pack_html():
    # Legacy link target used by some pages (e.g. Plan Your Trip navbar).
    return _safe_send(_TEMPLATES_ROOT / "packages", "Pack.html")
