from __future__ import annotations

import os
from dataclasses import dataclass

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
		"Rules:\n"
		"- Use clear headings: Day 1, Day 2, ...\n"
		"- For each day include: Morning (9:00-12:00), Afternoon (12:00-17:00), Evening (17:00-22:00).\n"
		"- For each time block include 3-5 concrete activities with short details (what, where, why).\n"
		"- Include 2 restaurant/food suggestions per day (local + budget-friendly), with what to order.\n"
		"- Include transport guidance (walk/metro/taxi/bus), realistic time estimates, and local tips.\n"
		"- Include an estimated budget per day (low/mid/high) in the local currency if possible.\n"
		"- Add a short 'Booking/Timing tips' and 'Safety notes' section per day.\n"
		"- Keep it practical (opening hours, neighborhood grouping) and avoid vague filler.\n"
	)


def generate_itinerary_text(req: ItineraryRequest) -> str:
	api_key = _get_env("COHERE_API_KEY")
	if not api_key:
		raise AIServiceError("COHERE_API_KEY is not set")

	api_url = _get_env("COHERE_API_URL") or "https://api.cohere.ai/v1/generate"
	model = _get_env("COHERE_MODEL") or "command"

	payload = {
		"model": model,
		"prompt": _build_prompt(req),
		"max_tokens": 2200,
		"temperature": 0.6,
		"k": 0,
		"stop_sequences": [],
		"return_likelihoods": "NONE",
	}

	headers = {
		"Authorization": f"Bearer {api_key}",
		"Content-Type": "application/json",
		# Keep the version aligned to the legacy JS usage for compatibility.
		"Cohere-Version": "2022-12-06",
	}

	try:
		resp = requests.post(api_url, json=payload, headers=headers, timeout=45)
	except requests.RequestException as exc:
		raise AIServiceError(f"Failed to call Cohere: {exc}") from exc

	if resp.status_code >= 400:
		# Do not leak secrets; include only status and a short body snippet.
		snippet = (resp.text or "").strip()[:400]
		raise AIServiceError(f"Cohere error {resp.status_code}: {snippet}")

	data = resp.json() if resp.content else {}
	generations = data.get("generations") or []
	if not generations or not isinstance(generations, list):
		raise AIServiceError("Unexpected Cohere response (missing generations)")

	text = (generations[0].get("text") if isinstance(generations[0], dict) else None) or ""
	text = text.strip()
	if not text:
		raise AIServiceError("Cohere returned empty itinerary")
	return text
