# LetsTravel

A Flask + MongoDB travel web application with user authentication, tour browsing, booking/checkout flow, ticket generation, and an admin dashboard.

This repo was reorganized into a production-friendly Flask structure (`templates/`, `static/`, WSGI entrypoint), while keeping many legacy URLs working (for older HTML pages that still reference paths like `/css codes/...` and `/js code/...`).

## Key features

- **User auth**: Register, login, logout.
- **User dashboard**: Browse featured tours and categories.
- **Search & activity tracking**:
  - Page views are recorded server-side for logged-in users.
  - Searches and bookings are stored under user activity documents.
- **Booking + checkout**: Create a booking and complete a payment-confirm flow.
- **Tickets**: View ticket HTML and generate a ticket PDF.
- **Admin dashboard**:
  - Users / Tours / Bookings tabs
  - Export users/bookings/tours to Excel
  - Basic user activity table (page views/search counts)
- **Legacy compatibility**: Many old URLs are routed/served via a dedicated public blueprint.

## Tech stack

- **Backend**: Python, Flask
- **Database**: MongoDB (via MongoEngine)
- **Exports**: Pandas + XlsxWriter
- **PDF generation**: ReportLab
- **Production servers**: Gunicorn (Linux/macOS) or Waitress (Windows)
- **Optional tooling**: Node.js scripts for Amadeus API testing (see `tools/node/`)

## Project layout (high level)

- `app.py` — local dev entrypoint (creates the Flask app).
- `wsgi.py` — production WSGI entrypoint (`gunicorn wsgi:app`, `waitress-serve --call wsgi:app`).
- `backend/letstravel/` — Flask app factory + blueprints.
  - `backend/letstravel/__init__.py` — `create_app()` + request activity tracking.
  - `backend/letstravel/routes/` — `auth.py`, `main.py`, `admin.py`, `public.py`.
- `backend/models/` — MongoEngine document models (`User`, `Tour`, `Booking`, `UserActivity`).
- `templates/` — Jinja2 templates (auth, dashboard, admin, payment, and many legacy HTML pages).
- `static/` — CSS/JS/images and legacy assets.
- `manage.py` — maintenance CLI commands (admin setup/reset, seeding, indexes).
- `tools/` — smoke test script and archived legacy scripts.

## Prerequisites

- **Python** 3.10+ recommended
- **MongoDB** running locally, or a hosted MongoDB URI
- (Optional) **Node.js** 18+ if you want to run the scripts in `tools/node/`

## Environment variables

This app reads configuration from environment variables.

Common variables:

- `SECRET_KEY` — Flask secret key (required for production).
- `FLASK_ENV` — set to `development` for dev settings; defaults to production-like settings.
- `MONGODB_URI` — recommended in production, e.g. `mongodb://localhost:27017/letstravel_db` or Atlas connection string.
- `MONGODB_DB` — database name (default: `letstravel_db`).
- `MONGODB_HOST` — used only if `MONGODB_URI` is not set.
- `SESSION_DAYS` — cookie session lifetime in days (default: 7).
- `SESSION_COOKIE_SECURE` — `1` for HTTPS-only cookies (default in prod), `0` for local dev.

Optional (Node tooling):

- `AMADEUS_CLIENT_ID`
- `AMADEUS_CLIENT_SECRET`

You can put variables in a local `.env` file (it is ignored by git).

## Setup (Windows PowerShell)

1) Create and activate a virtual environment:

```powershell
cd "C:\Users\HARSHAL BARHATE\OneDrive\Desktop\LetsTravel"
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

2) Install dependencies:

```powershell
pip install -r requirements.txt
```

3) Ensure MongoDB is reachable.

- If MongoDB is local, the default config targets `mongodb://localhost:27017/letstravel_db`.
- Or set `MONGODB_URI` to your hosted MongoDB connection string.

4) Run the app:

```powershell
python app.py
```

Then open:

- `http://127.0.0.1:5000/login`

## Setup (macOS/Linux)

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

## Admin setup & maintenance commands

The project includes a small CLI.

### Create a default admin

```bash
python manage.py setup-admin
```

Default credentials:

- Email: `admin@letstravel.com`
- Password: `admin123`

### Reset admin password (recommended)

```bash
python manage.py reset-admin-password --email admin@letstravel.com --password "YourNewPassword"
```

### Other useful commands

```bash
python manage.py create-indexes
python manage.py seed-tours
python manage.py check-users
python manage.py summary
```

## Main routes

User-facing:

- `/login` — login page
- `/register` — registration page
- `/dashboard` — main user dashboard (requires login)
- `/packages` — packages page (requires login)

Admin:

- `/admin/dashboard` — admin dashboard (admin only)
- `/admin/export/users` — export users to Excel
- `/admin/export/bookings` — export bookings to Excel
- `/admin/export/tours` — export tours to Excel

Legacy compatibility (examples):

- `/index.html` (redirects appropriately)
- `/css codes/<file>` (alias to `static/css`)
- `/js code/<file>` (alias to `static/js`)
- `/Theme.js` (legacy theme toggler)

The legacy routes are handled by `public` blueprint in `backend/letstravel/routes/public.py`.

## Activity/session tracking (what is tracked)

- **Sessions**: When users log in/out, the app updates fields on the `User` document:
  - `login_count`, `last_login`, `active_sessions`, `total_session_duration`
- **User activities**: Stored in `user_activity` collection:
  - Page views (logged server-side for logged-in users)
  - Searches and bookings (written by route handlers)

Note: This is “basic analytics” (counts and history). It is not full analytics like time-on-page, geo analytics, heatmaps, etc.

## Smoke test (quick local verification)

A small smoke test script exists at `tools/smoke_flow.py`.

Run it after the server-side code is importable and MongoDB is reachable:

```bash
python tools/smoke_flow.py
```

It performs a lightweight flow check (login → dashboard → packages → checkout → payment confirm → ticket → ticket PDF) and also hits a few legacy URLs.

## Production deployment

### Render + MongoDB Atlas (recommended for demo deployments)

1) Create a free MongoDB Atlas cluster and copy the connection string.

2) Create a new **Web Service** on Render from this GitHub repo.

3) Set:

- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `gunicorn --bind 0.0.0.0:$PORT wsgi:app`

4) Add Render environment variables (Dashboard → Environment):

- `SECRET_KEY` (required)
- `MONGODB_URI` (Atlas connection string)
- `MONGODB_DB=letstravel_db` (or your preferred DB name)
- `FLASK_ENV=production`

Note: `localhost:27017` is only for local dev. In production you must use Atlas (or another hosted MongoDB).

### Gunicorn (Linux/macOS)

```bash
gunicorn wsgi:app
```

### Waitress (Windows)

```powershell
pip install waitress
waitress-serve --call wsgi:app
```

Recommended production environment variables:

- Set a strong `SECRET_KEY`
- Set `MONGODB_URI`
- Keep `SESSION_COOKIE_SECURE=1` when serving over HTTPS

## Optional: Node tooling (Amadeus API test)

The folder `tools/node/` contains scripts to test external APIs.

Install Node dependencies:

```bash
npm install
```

Run the Amadeus env var test:

```bash
node tools/node/test.js
```

Run the Amadeus flight search test:

```bash
node tools/node/amadeus.js
```

These scripts require `AMADEUS_CLIENT_ID` and `AMADEUS_CLIENT_SECRET` in your `.env`.

## Security notes

- Do **not** use the default admin credentials in production.
- This project stores an `original_password` field for some users/admins (for demo/admin convenience). This is **not secure** for real production use.

## Troubleshooting

- **Login works but dashboard/admin looks stuck**: hard refresh (`Ctrl+F5`) to clear cached JS/CSS.
- **Mongo connection errors**: verify MongoDB is running and `MONGODB_URI` is correct.
- **Port conflicts**: if port 5000 is already in use, set `FLASK_RUN_PORT` (or change the run command) and try again.

---

If you want, I can also add a `.env.example` (safe template) and a short “Deploy to Render/Heroku” section tailored to where you plan to host it.