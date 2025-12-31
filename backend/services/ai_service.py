from __future__ import annotations

import os
import re
from dataclasses import dataclass

import time

import requests


@dataclass(frozen=True)
class ItineraryRequest:
	destination: str
	duration_days: int
	travel_style: str
	interests: list[str]
	requirements: str


class AIServiceError(RuntimeError):
	pass


def _get_env(name: str) -> str | None:
	value = os.environ.get(name)
	if value is None:
		return None
	value = value.strip()
	return value or None


def _build_prompt(req: ItineraryRequest) -> str:
	interests = ", ".join([i for i in req.interests if i]) or "general sightseeing"
	requirements = (req.requirements or "").strip()

	# Keep it deterministic-ish and highly structured for easier rendering on the page.
	return (
		f"Create a very detailed {req.duration_days}-day travel itinerary for {req.destination}.\n"
		f"Travel style: {req.travel_style}.\n"
		f"Interests: {interests}.\n"
		f"Special requirements: {requirements if requirements else 'none'}.\n\n"
		"Output format rules (VERY IMPORTANT):\n"
		"- Output MUST be plain text only. Do NOT use Markdown.\n"
		"- Do NOT include any of these characters as formatting: #, *, `, ```\n"
		"- Do NOT wrap content in quotes or code blocks.\n"
		"- Use headings exactly like: DAY 1:, DAY 2:, ... (all caps).\n"
		"- Use section labels exactly like: MORNING (09:00-12:00), AFTERNOON (12:00-17:00), EVENING (17:00-22:00).\n\n"
		"Content rules:\n"
		"- Start with these sections in this order: OVERVIEW, WHERE TO STAY, LOCAL FOOD GUIDE, TRANSPORT BASICS.\n"
		"- OVERVIEW: 4-6 lines on best areas + daily flow + best time to visit.\n"
		"- WHERE TO STAY: list 3 options (BUDGET, MID-RANGE, PREMIUM) with suggested areas/neighborhood types.\n"
		"- LOCAL FOOD GUIDE: list 8-12 must-try items (mix of meals + snacks + desserts).\n"
		"- TRANSPORT BASICS: how to move around (walk/transit/taxi), with a few practical tips.\n"
		"- For each time block include 4-6 concrete activities with short details (what, where, why).\n"
		"- Add realistic travel times between stops (in minutes).\n"
		"- Include 2 restaurant/food suggestions per day (one local specialty + one budget-friendly), with what to order.\n"
		"- Include transport guidance (walk/metro/taxi/bus), and neighborhood grouping to reduce backtracking.\n"
		"- Include a detailed budget per day (per person) with Low/Mid/High AND a breakdown: Food, Local transport, Tickets/activities, Misc.\n"
		"- Use the local currency if you know it (e.g., INR for Indian cities). If unsure, use USD.\n"
		"- Add 'BOOKING/TIMING TIPS' and 'SAFETY NOTES' per day.\n"
		"- At the end add: TOTAL BUDGET SUMMARY (low/mid/high totals for the full trip).\n"
		"- Keep it practical and specific; avoid filler and avoid placeholders like [insert].\n"
	)


def _clean_plain_text(text: str) -> str:
	# Remove common formatting artifacts so the UI shows clean text.
	lines: list[str] = []
	for raw_line in (text or "").splitlines():
		line = raw_line.rstrip("\r\n")
		if not line.strip():
			lines.append("")
			continue

		stripped = line.lstrip()
		# Drop fenced code block markers if the model outputs them.
		if stripped.startswith("```"):
			continue
		# Strip markdown heading markers.
		while stripped.startswith("#"):
			stripped = stripped[1:].lstrip()
		# Strip leading markdown bullets (keep hyphen lists as plain text).
		if stripped.startswith(("* ", "• ")):
			stripped = "- " + stripped[2:].lstrip()
		# Avoid odd quote wrappers.
		stripped = stripped.strip("\u201c\u201d\"")
		lines.append(stripped)

	# Normalize excessive blank lines.
	cleaned: list[str] = []
	blank_run = 0
	for line in lines:
		if line.strip() == "":
			blank_run += 1
			if blank_run <= 2:
				cleaned.append("")
			continue
		blank_run = 0
		cleaned.append(line)

	return "\n".join(cleaned).strip()


def _mock_itinerary(req: ItineraryRequest, reason: str) -> str:
	# A deterministic, detailed fallback for local development when the provider is unavailable.
	# This is not AI-generated; it is meant to keep the feature usable during setup.
	# IMPORTANT: Do not surface provider/rate-limit reasons in the user-visible itinerary.
	destination = (req.destination or "").strip() or "Your Destination"
	travel_style = (req.travel_style or "").strip() or "general"
	interests = [i.strip() for i in (req.interests or []) if i and i.strip()]
	interests_text = ", ".join(interests) if interests else "general sightseeing"
	requirements = (req.requirements or "").strip()

	def is_mumbai(name: str) -> bool:
		n = name.lower()
		return "mumbai" in n or "bombay" in n

	def is_india_destination(name: str) -> bool:
		# Heuristic for currency selection. We keep a generous set of common Indian destinations.
		n = (name or "").lower()
		india_tokens = [
			"india",
			"mumbai",
			"bombay",
			"delhi",
			"new delhi",
			"agra",
			"jaipur",
			"udaipur",
			"jodhpur",
			"jaisalmer",
			"goa",
			"pune",
			"bangalore",
			"bengaluru",
			"hyderabad",
			"chennai",
			"kolkata",
			"ahmedabad",
			"surat",
			"kochi",
			"cochin",
			"thiruvananthapuram",
			"trivandrum",
			"jaammu",
			"jammu",
			"kashmir",
			"srinagar",
			"leh",
			"ladakh",
			"manali",
			"shimla",
			"mussoorie",
			"rishikesh",
			"haridwar",
			"varanasi",
			"banaras",
			"ayodhya",
			"amritsar",
			"darjeeling",
			"ooty",
			"mysore",
			"mangalore",
			"andaman",
			"nicobar",
			"kerala",
			"rajasthan",
			"maharashtra",
			"gujarat",
			"tamil nadu",
			"karnataka",
			"telangana",
		]
		return any(tok in n for tok in india_tokens)

	def rupees(n: int) -> str:
		return f"₹{n}"

	lines: list[str] = []
	lines.append(f"{destination} — {req.duration_days}-DAY ITINERARY")
	lines.append(f"STYLE: {travel_style}")
	lines.append(f"INTERESTS: {interests_text}")
	if requirements:
		lines.append(f"REQUIREMENTS: {requirements}")
	lines.append("")
	lines.append("GENERAL TIPS")
	lines.append("- Start early to beat traffic and queues.")
	lines.append("- Keep plans neighborhood-based to reduce backtracking.")
	lines.append("- Carry water + power bank; keep cash for small stalls.")
	lines.append("")

	# Destination-specific template (Mumbai). Falls back to a generic version for other places.
	if is_mumbai(destination):
		lines.append("WHERE TO STAY (RECOMMENDED AREAS)")
		lines.append("- BUDGET: Andheri East / Santacruz East / Dadar (good connectivity, many options)")
		lines.append("- MID-RANGE: Bandra / Lower Parel / Powai (cafes, nightlife, convenient)")
		lines.append("- PREMIUM: Colaba / Nariman Point / Juhu (views, iconic areas, higher prices)")
		lines.append("STAY TIPS")
		lines.append("- Prefer walking-distance to a metro/local train station to save time.")
		lines.append("- In Mumbai, short distances can take long in traffic; choose 1-2 base areas.")
		lines.append("")

		lines.append("LOCAL FOOD GUIDE (WHAT TO TRY)")
		lines.append("- Vada pav, pav bhaji, misal pav, batata vada")
		lines.append("- Bombay sandwich, bhel/pani puri/sev puri, frankie")
		lines.append("- South Indian breakfasts (idli/dosa), Maharashtrian thali")
		lines.append("- Desserts: kulfi, falooda, local bakery items")
		lines.append("")

		# Approximate ranges (kept broad) so it feels like a guide without pretending exact prices.
		low_food = (300, 700)
		mid_food = (700, 1500)
		high_food = (1500, 3000)
		local_transport = (120, 350)
		taxi_buffer = (300, 900)
		tickets = (150, 800)
		misc = (150, 500)

		for day in range(1, req.duration_days + 1):
			lines.append(f"DAY {day}:")
			if day == 1:
				lines.append("MORNING (09:00-12:00)")
				lines.append("- 09:00 Breakfast in Colaba/Fort (10-15 min walk). Try misal pav/idli/dosa/pav bhaji. Cost: ₹150-₹450.")
				lines.append("- 09:45 Gateway of India + waterfront photos (25-35 mins).")
				lines.append("- 10:30 Walk to Taj Palace frontage + Colaba streets (15-20 mins).")
				lines.append("- 11:00 Kala Ghoda art/heritage lane walk (45-60 mins).")
				lines.append("- 11:50 Quick coffee/snack stop (10-15 mins) to reset before the next leg.")
				lines.append("AFTERNOON (12:00-17:00)")
				lines.append("- 12:15 Lunch in Fort/Churchgate (15-25 min travel). Options: thali, seafood, cafe bowl. Cost: ₹300-₹1000.")
				lines.append("- 13:30 Travel to Marine Drive (20-35 mins by taxi; 35-55 mins by transit).")
				lines.append("- 14:15 Marine Drive + nearby lanes (75-90 mins). Keep it slow; Mumbai heat can be intense.")
				lines.append("- 15:50 Adventure block (choose one, 60-120 mins):")
				lines.append("  - Indoor climbing/trampoline-style adventure (entry often ₹600-₹1500).")
				lines.append("  - Coastal cycling/walk-run loop (rentals often ₹200-₹500).")
				lines.append("- 16:50 Buffer for transit + refresh (30-45 mins).")
				lines.append("EVENING (17:00-22:00)")
				lines.append("- 17:30 Sunset at Marine Drive (best light 18:00-19:00).")
				lines.append("- 19:00 Snack stop: bhel/pani puri/frankie/kulfi (₹80-₹300).")
				lines.append("- 20:00 Head to Bandra (35-70 mins). Bandstand + Bandra Fort viewpoint (45-60 mins).")
				lines.append("- 21:15 Dinner in Bandra or Lower Parel (₹600-₹2200 depending on place).")
				lines.append("- 22:00 Return (use rideshare late; keep 15-20 min buffer).")
			else:
				lines.append("MORNING (09:00-12:00)")
				lines.append("- 09:00 Breakfast near your base (Andheri/Borivali side if going north). Try poha/upma/vada pav. ₹120-₹350.")
				lines.append("- 10:00 Sanjay Gandhi National Park (travel 30-75 mins). Spend 2-3 hours on easy trails.")
				lines.append("- 11:30 Add an adventure angle: longer trail loop + viewpoint stop (ask at entry for current safe routes).")
				lines.append("- 11:50 Hydration + rest break (10-15 mins).")
				lines.append("AFTERNOON (12:00-17:00)")
				lines.append("- 12:30 Lunch near Borivali/Kandivali: thali/quick bites (₹250-₹800).")
				lines.append("- 14:00 Adventure block (choose one, 60-120 mins):")
				lines.append("  - Cycling loop (if you have a safe route) (₹200-₹500 rental if needed).")
				lines.append("  - Indoor adventure activity (climbing/zipline-style park) if available (₹600-₹1600).")
				lines.append("- 16:15 Travel buffer + refresh (45-60 mins).")
				lines.append("EVENING (17:00-22:00)")
				lines.append("- 17:30 Juhu Beach or Versova: long walk + photos (travel 30-75 mins).")
				lines.append("- 19:00 Snack: pav bhaji/kulfi/grilled corn (₹100-₹350).")
				lines.append("- 20:15 Dinner in Juhu/Andheri: one local specialty + one cafe dessert stop (₹450-₹1800).")
				lines.append("- 21:30 Optional: well-lit promenade walk; avoid isolated stretches late.")

			lines.append("NEARBY EATERIES (SUGGESTIONS)")
			lines.append("- Colaba/Fort: Leopold Cafe, Cafe Mondegar, Olympia Coffee House (verify timings).")
			lines.append("- Churchgate: Kyani & Co (bakery), street snacks around the station.")
			lines.append("- Marine Drive area: pizza/cafes + dessert shops nearby (ask locals for the best kulfi/falooda).")
			lines.append("- Bandra: Carter Road/Linking Road area for cafes + street food; plenty of solo-friendly spots.")
			lines.append("- Juhu: beach snacks + dessert places; go earlier for easier seating.")
			lines.append("TRANSPORT")
			lines.append("- Best value: local train/metro for long hops; walk within Colaba/Fort/Bandra clusters.")
			lines.append("- Time-critical: taxi/rideshare; add 15-30 mins buffer during peak hours.")
			lines.append("DAILY BUDGET (PER PERSON, APPROX INR)")
			lines.append(f"- LOW: Food {rupees(low_food[0])}-{rupees(low_food[1])}, Transport {rupees(local_transport[0])}-{rupees(local_transport[1])}, Tickets {rupees(tickets[0])}-{rupees(tickets[1])}, Misc {rupees(misc[0])}-{rupees(misc[1])}")
			lines.append(f"- MID: Food {rupees(mid_food[0])}-{rupees(mid_food[1])}, Transport {rupees(taxi_buffer[0])}-{rupees(taxi_buffer[1])}, Tickets {rupees(tickets[0])}-{rupees(tickets[1])}, Misc {rupees(misc[0])}-{rupees(misc[1])}")
			lines.append(f"- HIGH: Food {rupees(high_food[0])}-{rupees(high_food[1])}, Transport {rupees(taxi_buffer[0])}-{rupees(taxi_buffer[1])}, Tickets {rupees(tickets[0])}-{rupees(tickets[1])}, Misc {rupees(misc[0])}-{rupees(misc[1])}")
			lines.append("BOOKING/TIMING TIPS")
			lines.append("- Prefer weekday mornings for popular spots; weekends are crowded.")
			lines.append("- For ferries/parks, check latest timings at the gate (seasonal changes happen).")
			lines.append("SAFETY NOTES")
			lines.append("- Keep valuables secure in crowds; avoid isolated areas late at night.")
			lines.append("- Use well-lit routes; share your live location if traveling solo.")
			lines.append("")

		# Total summary (very broad ranges).
		lines.append("TOTAL BUDGET SUMMARY (APPROX INR, PER PERSON)")
		lines.append(f"- LOW TOTAL: {rupees(req.duration_days * 700)}-{rupees(req.duration_days * 2200)}")
		lines.append(f"- MID TOTAL: {rupees(req.duration_days * 1400)}-{rupees(req.duration_days * 4200)}")
		lines.append(f"- HIGH TOTAL: {rupees(req.duration_days * 2500)}-{rupees(req.duration_days * 7500)}")

		return "\n".join(lines).strip()

	# Generic fallback for any destination (detailed but avoids making up exact addresses).
	use_inr = is_india_destination(destination)
	currency = "INR" if use_inr else "USD"
	lines.append("WHERE TO STAY (RECOMMENDED AREAS)")
	lines.append("- BUDGET: Near a main transit hub / central station area (easy commuting)")
	lines.append("- MID-RANGE: Central neighborhoods close to the top sights + restaurants")
	lines.append("- PREMIUM: Waterfront/landmark districts or upscale shopping areas")
	lines.append("STAY TIPS")
	lines.append("- Choose one base area and explore nearby zones each day to reduce travel time.")
	lines.append("- Prioritize safety, lighting, and late-night connectivity if traveling solo.")
	lines.append("")

	lines.append("LOCAL FOOD GUIDE (WHAT TO TRY)")
	if use_inr:
		lines.append("- Local thali/meal set, a signature curry/snack, and one regional dessert")
		lines.append("- Street snacks (only at busy, clean stalls) + one classic breakfast item")
		lines.append("- Fresh juices/coconut water + a bakery item")
	else:
		lines.append("- 2 signature local dishes + 1 snack + 1 dessert")
		lines.append("- A local breakfast item + one popular street-food style bite")
		lines.append("- A market snack + a cafe drink/dessert")
	lines.append("")

	lines.append("TRANSPORT BASICS")
	lines.append("- Use public transit for long hops; walk inside a neighborhood cluster.")
	lines.append("- Keep a rideshare/taxi option for late-night or time-critical transfers.")
	lines.append("- Always add a 15-30 minute buffer for traffic/queues.")
	lines.append("")

	interest_set = {i.lower() for i in interests}
	likes_adventure = any(k in interest_set for k in ["adventure", "trekking", "hiking", "nature", "outdoors"])
	likes_food = any(k in interest_set for k in ["food", "street food", "cuisine"])
	likes_history = any(k in interest_set for k in ["history", "culture", "heritage", "museum", "architecture"])
	likes_shopping = any(k in interest_set for k in ["shopping", "markets"])
	likes_relax = any(k in interest_set for k in ["relax", "beach", "wellness"])

	def money_range(low: int, high: int) -> str:
		if use_inr:
			return f"₹{low}-₹{high}"
		return f"${low}-${high}"

	# Broad, realistic daily ranges (per person). These are guidance ranges, not guarantees.
	if use_inr:
		food_low, food_mid, food_high = (300, 800), (800, 1600), (1600, 3200)
		transport_low, transport_mid, transport_high = (120, 350), (300, 900), (500, 1800)
		tickets_low, tickets_mid, tickets_high = (150, 700), (300, 1500), (600, 3000)
		misc_low, misc_mid, misc_high = (150, 500), (250, 900), (400, 1800)
	else:
		food_low, food_mid, food_high = (15, 35), (35, 70), (70, 140)
		transport_low, transport_mid, transport_high = (6, 15), (15, 35), (35, 80)
		tickets_low, tickets_mid, tickets_high = (8, 20), (20, 45), (45, 90)
		misc_low, misc_mid, misc_high = (5, 15), (10, 30), (20, 60)

	def day_budget_lines() -> list[str]:
		return [
			f"- LOW: Food {money_range(*food_low)}, Transport {money_range(*transport_low)}, Tickets {money_range(*tickets_low)}, Misc {money_range(*misc_low)}",
			f"- MID: Food {money_range(*food_mid)}, Transport {money_range(*transport_mid)}, Tickets {money_range(*tickets_mid)}, Misc {money_range(*misc_mid)}",
			f"- HIGH: Food {money_range(*food_high)}, Transport {money_range(*transport_high)}, Tickets {money_range(*tickets_high)}, Misc {money_range(*misc_high)}",
		]

	for day in range(1, req.duration_days + 1):
		lines.append(f"DAY {day}:")
		lines.append("MORNING (09:00-12:00)")
		lines.append("- 09:00 Breakfast near your stay (10-15 min walk). Order one local breakfast item + tea/coffee.")
		lines.append("- 09:45 Old town / downtown landmark loop (75-90 mins). Keep stops within one neighborhood.")
		if likes_history:
			lines.append("- 11:15 Museum/heritage building (60 mins). Choose 1 focused place, not many.")
		elif likes_relax:
			lines.append("- 11:15 Slow experience: riverside/park/garden walk (45-60 mins).")
		else:
			lines.append("- 11:15 Viewpoint/photospot + short local street exploration (45-60 mins).")
		lines.append("AFTERNOON (12:00-17:00)")
		lines.append("- 12:15 Lunch near the same area as morning sights (15-25 mins travel). Choose one signature dish.")
		lines.append("- 13:30 Big attraction block: 2 nearby activities + transit buffer (20-40 mins).")
		if likes_adventure:
			lines.append("- 15:45 Adventure block: short hike/steps trail/cycling loop/indoor climbing (60-120 mins).")
		else:
			lines.append("- 15:45 Extra experience: local workshop, gallery, or scenic district walk (60-90 mins).")
		lines.append("- 16:50 Buffer for rest + transit (30-45 mins).")
		lines.append("EVENING (17:00-22:00)")
		lines.append("- 17:30 Sunset viewpoint / waterfront / main promenade (60-75 mins).")
		if likes_shopping:
			lines.append("- 19:00 Market/shopping street (60-90 mins). Focus on one market to avoid exhaustion.")
		else:
			lines.append("- 19:00 Local market street + snack stop (60-90 mins).")
		if likes_food:
			lines.append("- 20:15 Food crawl (2 stops): one famous local snack + one dessert/tea spot (45-60 mins).")
		lines.append("- 21:00 Dinner near your base area to reduce late-night transit (60-75 mins).")
		lines.append("NEARBY EATERIES (HOW TO PICK GOOD ONES)")
		lines.append("- Choose busy places with high turnover; for street food prefer clean, popular stalls.")
		lines.append("- Ask your hotel/host for 1 local specialty place + 1 budget-friendly option nearby.")
		lines.append("TRANSPORT")
		lines.append("- Use public transit for long hops; walk within a neighborhood cluster.")
		lines.append("DAILY BUDGET (PER PERSON, APPROX)")
		lines.extend(day_budget_lines())
		lines.append("BOOKING/TIMING TIPS")
		lines.append("- Start early; pre-book timed-entry attractions or popular activities if available.")
		lines.append("- Keep 1 backup activity nearby in case a place is closed or crowded.")
		lines.append("SAFETY NOTES")
		lines.append("- Keep valuables secure and stay hydrated; avoid isolated areas late.")
		lines.append("- If solo: prefer well-lit routes and share your live location at night.")
		lines.append("")

	lines.append("TOTAL BUDGET SUMMARY (APPROX, PER PERSON)")
	if use_inr:
		lines.append(f"- LOW TOTAL: ₹{req.duration_days * 700}-₹{req.duration_days * 2350}")
		lines.append(f"- MID TOTAL: ₹{req.duration_days * 1350}-₹{req.duration_days * 4950}")
		lines.append(f"- HIGH TOTAL: ₹{req.duration_days * 2500}-₹{req.duration_days * 9880}")
	else:
		lines.append(f"- LOW TOTAL: ${req.duration_days * 30}-${req.duration_days * 85}")
		lines.append(f"- MID TOTAL: ${req.duration_days * 60}-${req.duration_days * 180}")
		lines.append(f"- HIGH TOTAL: ${req.duration_days * 120}-${req.duration_days * 360}")

	# Avoid returning the reason to the user; keep it only for server-side decisions.
	_ = reason
	return "\n".join(lines).strip()


_DAY_HEADER_RE = re.compile(r"^\s*(DAY|Day)\s+(\d+)\s*:\s*", flags=re.IGNORECASE | re.MULTILINE)


def _ensure_itinerary_complete(req: ItineraryRequest, text: str) -> str:
	"""Ensure the itinerary contains all days (1..duration) and isn't blank.

	The UI expects each day to exist and have content. If the model returns an
	incomplete itinerary, we fill missing days with a detailed plain-text template.
	"""
	text = (text or "").strip()
	if not text:
		return _mock_itinerary(req, reason="empty")

	# Find day blocks.
	matches = list(_DAY_HEADER_RE.finditer(text))
	if not matches:
		# If no DAY headers at all, fall back to deterministic template.
		return _mock_itinerary(req, reason="no-day-headers")

	blocks: dict[int, str] = {}
	order: list[int] = []
	for idx, m in enumerate(matches):
		start = m.start()
		end = matches[idx + 1].start() if idx + 1 < len(matches) else len(text)
		try:
			day_num = int(m.group(2))
		except Exception:
			continue
		if day_num < 1 or day_num > req.duration_days:
			continue
		block = text[start:end].strip()
		if not block:
			continue
		blocks[day_num] = block
		order.append(day_num)

	# If the model skipped some days, fill them.
	missing = [d for d in range(1, req.duration_days + 1) if d not in blocks]
	if not missing:
		# Still ensure each day has the required time sections; otherwise replace that day.
		fixed_blocks: dict[int, str] = {}
		for d, block in blocks.items():
			b = block
			if "MORNING" not in b.upper() or "AFTERNOON" not in b.upper() or "EVENING" not in b.upper():
				b = _mock_itinerary(ItineraryRequest(req.destination, 1, req.travel_style, req.interests, req.requirements), reason="fix-day")
				# Extract the single DAY 1 block and rename it.
				m1 = _DAY_HEADER_RE.search(b)
				if m1:
					b = re.sub(r"(?im)^\s*(DAY|Day)\s+1\s*:\s*", f"DAY {d}: ", b, count=1)
				# Keep only from DAY d onward.
				m2 = re.search(rf"(?im)^\s*DAY\s+{d}\s*:\s*", b)
				if m2:
					b = b[m2.start():].strip()
			fixed_blocks[d] = b
		blocks = fixed_blocks
	else:
		# Build missing day blocks using the generic template section from _mock_itinerary.
		for d in missing:
			one = _mock_itinerary(ItineraryRequest(req.destination, 1, req.travel_style, req.interests, req.requirements), reason="missing-day")
			# Replace DAY 1 -> DAY d
			one = re.sub(r"(?im)^\s*(DAY|Day)\s+1\s*:\s*", f"DAY {d}: ", one, count=1)
			# Keep only the day block.
			mday = re.search(rf"(?im)^\s*DAY\s+{d}\s*:\s*", one)
			if mday:
				one = one[mday.start():].strip()
			blocks[d] = one

	# Rebuild with preamble (everything before DAY 1 header) + days in correct order.
	first = matches[0].start()
	preamble = text[:first].strip()
	parts: list[str] = []
	if preamble:
		parts.append(preamble)
	parts.append("")
	for d in range(1, req.duration_days + 1):
		b = blocks.get(d)
		if b:
			parts.append(b.strip())
			parts.append("")

	merged = "\n".join(parts).strip()

	# Ensure total budget summary exists.
	if "TOTAL BUDGET SUMMARY" not in merged.upper():
		append = _mock_itinerary(ItineraryRequest(req.destination, req.duration_days, req.travel_style, req.interests, req.requirements), reason="missing-summary")
		# Extract the summary section only.
		m = re.search(r"(?im)^TOTAL BUDGET SUMMARY.*$", append)
		if m:
			merged = (merged + "\n\n" + append[m.start():].strip()).strip()

	return merged


def generate_itinerary_text(req: ItineraryRequest) -> str:
	# Local-dev friendly fallback toggle (used for missing keys, throttling and transient provider/network issues).
	allow_fallback = (_get_env("ALLOW_ITINERARY_MOCK_FALLBACK") or "1") != "0"
	env = (_get_env("FLASK_ENV") or "").lower()
	is_prod = env in {"production", "prod"}

	api_key = _get_env("COHERE_API_KEY")
	if not api_key:
		# In local/dev, keep the feature usable even if .env isn't loaded by the server.
		if allow_fallback and not is_prod:
			return _mock_itinerary(req, reason="missing-api-key")
		raise AIServiceError("COHERE_API_KEY is not set")

	# Cohere deprecated/removed the legacy Generate endpoint; use the Chat API.
	api_url = _get_env("COHERE_API_URL") or "https://api.cohere.com/v2/chat"
	model = _get_env("COHERE_MODEL") or "command-a-03-2025"

	# Keep token usage reasonable to reduce throttling risk.
	payload = {
		"model": model,
		"messages": [
			{
				"role": "user",
				"content": _build_prompt(req),
			}
		],
		"temperature": 0.6,
		"max_tokens": 1200,
		"stream": False,
	}

	headers = {
		"Authorization": f"Bearer {api_key}",
		"Content-Type": "application/json",
	}

	def do_call() -> requests.Response:
		return requests.post(api_url, json=payload, headers=headers, timeout=45)

	def call_with_retry() -> requests.Response:
		# Retry a couple of times for transient network issues (Connection reset, timeouts).
		last_exc: Exception | None = None
		for attempt in range(3):
			try:
				return do_call()
			except requests.RequestException as exc:
				last_exc = exc
				# backoff: 0.5s, 1.5s
				if attempt < 2:
					time.sleep(0.5 + attempt)
					continue
				break
		# If we got here, all attempts failed.
		raise AIServiceError(f"Failed to call Cohere: {last_exc}")

	try:
		resp = call_with_retry()
	except AIServiceError as exc:
		# If Cohere is unreachable (network), keep local development usable.
		if allow_fallback and not is_prod:
			return _mock_itinerary(req, reason="provider-unreachable")
		raise
	# Cohere free tiers can return 429 when throttled. Retry once after a short delay.
	if resp.status_code == 429:
		time.sleep(2)
		resp = do_call()

	# Local-dev friendly fallback (only for throttling / temporary provider outages).
	if allow_fallback and not is_prod:
		if resp.status_code == 429:
			return _mock_itinerary(req, reason="Cohere rate-limited (HTTP 429)")
		if 500 <= resp.status_code <= 599:
			return _mock_itinerary(req, reason=f"Cohere unavailable (HTTP {resp.status_code})")

	if resp.status_code >= 400:
		# Do not leak secrets; include only status and a short body snippet.
		snippet = (resp.text or "").strip()[:400]
		raise AIServiceError(f"Cohere error {resp.status_code}: {snippet}")

	# Cohere may occasionally return non-JSON bodies on error/proxy layers.
	data: dict | None = {}
	if resp.content:
		try:
			data = resp.json()
		except Exception:
			# If we can't parse JSON, treat it as a provider failure.
			snippet = (resp.text or "").strip()[:400]
			if allow_fallback and not is_prod:
				return _mock_itinerary(req, reason="provider-non-json")
			raise AIServiceError(f"Cohere returned an invalid response format. Body: {snippet}")

	# Cohere Chat response shape (v2): data.message.content = [{type: 'text', text: '...'}]
	message = data.get("message") if isinstance(data, dict) else None
	content = message.get("content") if isinstance(message, dict) else None
	text_parts: list[str] = []
	if isinstance(content, list):
		for item in content:
			if isinstance(item, dict) and item.get("type") == "text":
				piece = (item.get("text") or "").strip()
				if piece:
					text_parts.append(piece)
	elif isinstance(content, str):
		if content.strip():
			text_parts.append(content.strip())

	text = "\n".join(text_parts).strip()
	text = _clean_plain_text(text)
	text = _ensure_itinerary_complete(req, text)
	if not text:
		raise AIServiceError("Cohere returned empty itinerary")
	return text
