from __future__ import annotations

from datetime import datetime, timezone

from flask import Blueprint, flash, jsonify, redirect, render_template, request, send_file, session, url_for

from letstravel.routes.auth import login_required
from models.database import Booking, Tour, User
from models.user_activity import Booking as BookingActivity
from models.user_activity import SearchQuery, UserActivity


main_bp = Blueprint("main", __name__)


@main_bp.route("/index.html")
def legacy_index_html():
    # Several templates link to /index.html as "home".
    # Keep it working by routing to dashboard/login appropriately.
    if "user_id" in session:
        return redirect(url_for("main.dashboard"))
    return redirect(url_for("auth.login"))


@main_bp.route("/dashboard")
@login_required
def dashboard():
    try:
        featured_tours = Tour.objects(featured=True)

        categories = ["Beach", "Mountain", "Adventure", "Cultural"]
        tours_by_category = {category: Tour.objects(category=category) for category in categories}

        return render_template(
            "dashboard/index.html",
            username=session.get("username"),
            featured_tours=featured_tours,
            tours_by_category=tours_by_category,
        )
    except Exception as e:
        print(f"Database error: {e}")
        return render_template(
            "dashboard/index.html",
            username=session.get("username"),
            error="Failed to load tours",
            featured_tours=[],
            tours_by_category={},
        )


@main_bp.route("/search")
@login_required
def search():
    query = request.args.get("q", "")
    filters = request.args.to_dict()
    results = Tour.objects(__raw__=filters)

    search_query = SearchQuery(query=query, filters=filters, results_count=len(results))
    UserActivity.objects(user_id=session["user_id"]).update_one(
        push__search_history=search_query,
        set__updated_at=datetime.now(timezone.utc),
    )

    return jsonify(results)


@main_bp.route("/book_tour", methods=["POST"])
@login_required
def book_tour():
    tour_id = request.form.get("tour_id")
    travel_date = request.form.get("travel_date")

    try:
        tour = Tour.objects(id=tour_id).first()
        user = User.objects(id=session["user_id"]).first()

        booking = (
            Booking(
                user=user,
                tour=tour,
                travel_date=datetime.strptime(travel_date, "%Y-%m-%d"),
                amount=tour.price,
            ).save()
        )

        booking_activity = BookingActivity(
            booking_id=str(booking.id),
            package_id=tour_id,
            travel_date=booking.travel_date,
            amount=booking.amount,
        )
        UserActivity.objects(user_id=session["user_id"]).update_one(
            push__bookings=booking_activity,
            set__updated_at=datetime.now(timezone.utc),
        )

        # Move user into checkout flow to complete payment.
        flash("Booking created. Please complete payment.")
        return redirect(url_for("main.checkout", booking_id=str(booking.id)))

    except Exception as e:
        flash("Booking failed. Please try again.")
        print(f"Booking error: {e}")
        return redirect(url_for("main.dashboard"))


@main_bp.route("/packages")
@login_required
def packages():
    return render_template("packages/packages.html", username=session.get("username"))


@main_bp.route("/checkout")
@login_required
def checkout():
    booking_id = request.args.get("booking_id")
    if not booking_id:
        flash("Missing booking.")
        return redirect(url_for("main.dashboard"))

    booking = Booking.objects(id=booking_id).first()
    if not booking or str(booking.user.id) != session.get("user_id"):
        flash("Booking not found.")
        return redirect(url_for("main.dashboard"))

    tour = booking.tour
    return render_template(
        "payment/checkout.html",
        username=session.get("username"),
        booking=booking,
        tour=tour,
        user=booking.user,
    )


@main_bp.route("/payment/confirm", methods=["POST"])
@login_required
def payment_confirm():
    booking_id = request.form.get("booking_id")
    if not booking_id:
        flash("Missing booking.")
        return redirect(url_for("main.dashboard"))

    booking = Booking.objects(id=booking_id).first()
    if not booking or str(booking.user.id) != session.get("user_id"):
        flash("Booking not found.")
        return redirect(url_for("main.dashboard"))

    update_fields: dict[str, object] = {
        "status": "paid",
        "paid_at": datetime.now(timezone.utc),
    }

    # Optional journey details from checkout form
    travel_date_str = (request.form.get("travel_date") or "").strip()
    if travel_date_str:
        try:
            # Store the selected date as a UTC datetime (midnight).
            parsed = datetime.strptime(travel_date_str, "%Y-%m-%d").replace(tzinfo=timezone.utc)
            update_fields["travel_date"] = parsed
        except Exception:
            pass

    journey_time_slot = (request.form.get("journey_time_slot") or "").strip()
    if journey_time_slot:
        update_fields["journey_time_slot"] = journey_time_slot

    journey_origin = (request.form.get("journey_origin") or "").strip()
    if journey_origin:
        update_fields["journey_origin"] = journey_origin

    journey_destination = (request.form.get("journey_destination") or "").strip()
    if journey_destination:
        update_fields["journey_destination"] = journey_destination

    travellers_raw = (request.form.get("travellers") or "").strip()
    if travellers_raw:
        try:
            travellers = int(travellers_raw)
            if travellers > 0:
                update_fields["travellers"] = travellers
        except Exception:
            pass

    journey_notes = (request.form.get("journey_notes") or "").strip()
    if journey_notes:
        update_fields["journey_notes"] = journey_notes

    Booking.objects(id=booking_id).update_one(**{f"set__{k}": v for k, v in update_fields.items()})
    flash("Payment successful!")
    return redirect(url_for("public.payment_success_html", booking_id=booking_id))


@main_bp.route("/ticket/<booking_id>")
@login_required
def ticket(booking_id: str):
    booking = Booking.objects(id=booking_id).first()
    if not booking or str(booking.user.id) != session.get("user_id"):
        flash("Booking not found.")
        return redirect(url_for("main.dashboard"))

    return render_template(
        "tickets/invoice.html",
        username=session.get("username"),
        booking=booking,
        tour=booking.tour,
        user=booking.user,
    )


@main_bp.route("/ticket/<booking_id>/pdf")
@login_required
def ticket_pdf(booking_id: str):
    booking = Booking.objects(id=booking_id).first()
    if not booking or str(booking.user.id) != session.get("user_id"):
        flash("Booking not found.")
        return redirect(url_for("main.dashboard"))

    # Only generate an invoice PDF for paid bookings.
    if (booking.status or "").lower() != "paid":
        flash("Payment is still pending for this booking.")
        return redirect(url_for("main.checkout", booking_id=booking_id))

    # Import ReportLab lazily so dev environments can still boot without it.
    try:
        from io import BytesIO

        from reportlab.lib.pagesizes import A4
        from reportlab.lib.units import mm
        from reportlab.pdfgen import canvas
    except Exception as e:
        flash("PDF generation dependency missing.")
        print(f"PDF generation import error: {e}")
        return redirect(url_for("main.ticket", booking_id=booking_id))

    invoice_number = f"INV-{str(booking.id)[-8:].upper()}"
    invoice_date = (booking.paid_at or booking.booking_date or datetime.now(timezone.utc)).astimezone(timezone.utc)

    tour = booking.tour
    user = booking.user

    subtotal = float(getattr(booking, "amount", 0) or 0)
    gst = subtotal * 0.18
    total = subtotal + gst

    buf = BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    width, height = A4

    margin_x = 18 * mm
    y = height - 22 * mm

    c.setFont("Helvetica-Bold", 18)
    c.drawString(margin_x, y, "letstravel")
    c.setFont("Helvetica", 10)
    y -= 10 * mm
    c.drawString(margin_x, y, "Invoice")

    c.setFont("Helvetica", 11)
    y -= 12 * mm
    c.drawString(margin_x, y, f"Invoice Number: {invoice_number}")
    y -= 6 * mm
    c.drawString(margin_x, y, f"Invoice Date: {invoice_date.strftime('%d %b %Y %H:%M UTC')}")

    y -= 12 * mm
    c.setFont("Helvetica-Bold", 12)
    c.drawString(margin_x, y, "Customer")
    c.setFont("Helvetica", 11)
    y -= 7 * mm
    c.drawString(margin_x, y, f"Name: {getattr(user, 'username', '')}")
    y -= 6 * mm
    c.drawString(margin_x, y, f"Email: {getattr(user, 'email', '')}")
    y -= 6 * mm
    c.drawString(margin_x, y, f"Mobile: {getattr(user, 'mobile', '')}")

    y -= 12 * mm
    c.setFont("Helvetica-Bold", 12)
    c.drawString(margin_x, y, "Booking")
    c.setFont("Helvetica", 11)
    y -= 7 * mm
    c.drawString(margin_x, y, f"Name: {getattr(tour, 'name', '')}")
    y -= 6 * mm
    c.drawString(margin_x, y, f"Category: {getattr(tour, 'category', '')}")
    y -= 6 * mm
    travel_date = getattr(booking, "travel_date", None)
    c.drawString(margin_x, y, f"Travel Date: {travel_date.strftime('%d %b %Y') if travel_date else ''}")
    y -= 6 * mm
    c.drawString(margin_x, y, f"Time Slot: {getattr(booking, 'journey_time_slot', '') or ''}")
    y -= 6 * mm
    c.drawString(margin_x, y, f"From: {getattr(booking, 'journey_origin', '') or ''}")
    y -= 6 * mm
    c.drawString(margin_x, y, f"To: {getattr(booking, 'journey_destination', '') or getattr(tour, 'location', '') or ''}")
    y -= 6 * mm
    travellers = getattr(booking, 'travellers', None)
    c.drawString(margin_x, y, f"Travellers: {travellers if travellers else ''}")

    service_type = (getattr(booking, "service_type", "") or "").strip().lower()
    service_details = getattr(booking, "service_details", None) or {}
    if service_type == "hotel":
        y -= 6 * mm
        c.drawString(margin_x, y, f"Check-in: {service_details.get('check_in', '') or ''}")
        y -= 6 * mm
        c.drawString(margin_x, y, f"Check-out: {service_details.get('check_out', '') or ''}")
    elif service_type == "flight":
        y -= 6 * mm
        airline = service_details.get('airline', '') or ''
        if airline:
            c.drawString(margin_x, y, f"Airline: {airline}")
            y -= 6 * mm
        dep = service_details.get('departure_at', '') or ''
        arr = service_details.get('arrival_at', '') or ''
        if dep:
            c.drawString(margin_x, y, f"Departure: {dep}")
            y -= 6 * mm
        if arr:
            c.drawString(margin_x, y, f"Arrival: {arr}")

    y -= 14 * mm
    c.setFont("Helvetica-Bold", 12)
    c.drawString(margin_x, y, "Amount")
    c.setFont("Helvetica", 11)
    y -= 7 * mm
    c.drawString(margin_x, y, f"Subtotal: INR {subtotal:,.2f}")
    y -= 6 * mm
    c.drawString(margin_x, y, f"GST (18%): INR {gst:,.2f}")
    y -= 6 * mm
    c.setFont("Helvetica-Bold", 12)
    c.drawString(margin_x, y, f"Total: INR {total:,.2f}")

    y -= 14 * mm
    c.setFont("Helvetica", 9)
    c.setFillGray(0.35)
    c.drawString(margin_x, y, f"Booking ID: {booking_id}")
    c.setFillGray(0)

    c.showPage()
    c.save()
    buf.seek(0)

    return send_file(
        buf,
        mimetype="application/pdf",
        as_attachment=True,
        download_name=f"{invoice_number}.pdf",
    )


@main_bp.route("/my-activity")
@login_required
def view_activity():
    user_activity = UserActivity.objects(user_id=session["user_id"]).first()
    return render_template(
        "dashboard/activity.html",
        activity=user_activity,
        username=session.get("username"),
    )
