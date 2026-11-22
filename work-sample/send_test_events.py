"""Send the four test people and their webinar events to a Customer.io workspace.

For a trial or sandbox workspace only. Nothing runs until you supply your own keys:

  set CIO_SITE_ID=...        (PowerShell: $env:CIO_SITE_ID = "...")
  set CIO_API_KEY=...
  python send_test_events.py --dry-run     # print the requests only
  python send_test_events.py               # send them

Uses the Customer.io Track API (v1): PUT /customers/{id} to identify a person,
POST /customers/{id}/events to send an event. EU-region workspaces use track-eu.customer.io;
check your workspace's region and the current API docs before running.
"""
import argparse, base64, json, os, urllib.request
from datetime import datetime, timedelta, timezone

BASE = os.environ.get("CIO_TRACK_URL", "https://track-eu.customer.io/api/v1")
start = (datetime.now(timezone.utc) + timedelta(days=2)).replace(minute=0, second=0, microsecond=0)
WEBINAR = {"webinar_id": "wx-wind-2026-12", "webinar_title": "Wind forecasts for operators: from data to dispatch",
           "webinar_start_at": int(start.timestamp()), "join_url": "https://webinar.example.com/j/123"}

# One test person per branch of the flow (see flow-spec.md, "Testing before launch").
PEOPLE = [
    ("test-attended", {"email": "qa+attended@example.com", "first_name": "Anna", "consent_marketing_email": True}, "webinar_attended"),
    ("test-missed", {"email": "qa+missed@example.com", "first_name": "Mikko", "consent_marketing_email": True}, "webinar_missed"),
    ("test-noconsent", {"email": "qa+noconsent@example.com", "first_name": "Laura", "consent_marketing_email": False}, "webinar_attended"),
    ("test-noname", {"email": "qa+noname@example.com", "consent_marketing_email": True}, None),
]


def call(method, path, body, auth, dry):
    url = f"{BASE}{path}"
    if dry:
        print(method, url, json.dumps(body))
        return
    req = urllib.request.Request(url, data=json.dumps(body).encode(), method=method,
                                 headers={"Content-Type": "application/json", "Authorization": f"Basic {auth}"})
    with urllib.request.urlopen(req, timeout=15) as resp:
        print(resp.status, method, path)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--outcomes", action="store_true", help="also send the attended/missed events (run after the webinar time)")
    a = ap.parse_args()
    site, key = os.environ.get("CIO_SITE_ID"), os.environ.get("CIO_API_KEY")
    if not a.dry_run and not (site and key):
        raise SystemExit("Set CIO_SITE_ID and CIO_API_KEY, or use --dry-run.")
    auth = base64.b64encode(f"{site}:{key}".encode()).decode() if site else ""
    for pid, attrs, outcome in PEOPLE:
        call("PUT", f"/customers/{pid}", attrs, auth, a.dry_run)
        call("POST", f"/customers/{pid}/events", {"name": "webinar_registered", "data": WEBINAR}, auth, a.dry_run)
        if a.outcomes and outcome:
            call("POST", f"/customers/{pid}/events", {"name": outcome, "data": {"webinar_id": WEBINAR["webinar_id"]}}, auth, a.dry_run)


if __name__ == "__main__":
    main()
