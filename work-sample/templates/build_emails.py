"""Build the four webinar-nurture emails from the block library.

Usage: python templates/build_emails.py
Writes campaigns/webinar-nurture/emails/*.html. Liquid tags stay in the HTML for Customer.io to fill.
"""
import json
from pathlib import Path
from blocks import document, header, heading, hero_image, paragraph, bullets, button, divider, footer, utm

ROOT = Path(__file__).resolve().parents[1]
CAMPAIGN = ROOT / "campaigns" / "webinar-nurture"
cfg = json.loads((CAMPAIGN / "campaign.json").read_text(encoding="utf-8"))
CID = cfg["campaign_id"]
SITE = "https://www.xweather.com/"
API = "https://www.xweather.com/weather-api"
DOCS = "https://www.xweather.com/docs"
CONTACT = "https://www.xweather.com/contact"
WIND = ("wind-farm.jpg", "Offshore wind turbines at sea under an evening sky")
NAME = '{{customer.first_name | default: "there"}}'
TITLE = '{{event.webinar_title | default: "our webinar"}}'


def msg(message_id):
    return next(m for m in cfg["messages"] if m["message_id"] == message_id)


EMAILS = {
    "confirm": [
        header("Webinar registration"),
        heading("You're registered", spacer=False),
        hero_image(*WIND),
        paragraph(f"Hi {NAME},"),
        paragraph(f"Your seat for <strong>{TITLE}</strong> is saved. The session starts "
                  '{{event.webinar_start_at | date: "%-d %B %Y, %H:%M UTC"}}.'),
        button("Join the session", "{{event.join_url}}"),
        paragraph("Add the session to your calendar from the join page. We will send the recording afterwards."),
        divider(),
        footer(transactional=True),
    ],
    "reminder-24h": [
        header("Tomorrow"),
        heading(TITLE, spacer=False),
        hero_image(*WIND),
        paragraph(f"Hi {NAME},"),
        paragraph("The session starts in 24 hours. One question to bring with you:"),
        bullets(["Which forecast decision costs your team the most when it is wrong?"]),
        button("Join the session", "{{event.join_url}}"),
        paragraph(f'Want to look at the data first? Browse the <a href="{utm(DOCS, CID, "reminder-24h")}" class="lnk" style="color:#27455C;">API documentation</a>.'),
        divider(),
        footer(),
    ],
    "followup-attended": [
        header("Thank you for joining"),
        heading("Slides, recording and the next step", spacer=False),
        hero_image(*WIND),
        paragraph(f"Hi {NAME},"),
        paragraph("Thanks for joining the session. Everything from it is in one place:"),
        bullets(["The full recording, with chapters", "The slides as a PDF", "Answers to the questions we ran out of time for"]),
        button("Watch the recording", utm(SITE, CID, "followup-attended")),
        paragraph(f'If you want to test the data on your own sites, <a href="{utm(API, CID, "followup-attended")}" class="lnk" style="color:#27455C;">try the weather API</a> '
                  f'or <a href="{utm(CONTACT, CID, "followup-attended")}" class="lnk" style="color:#27455C;">talk to our team</a>.'),
        divider(),
        footer(),
    ],
    "followup-missed": [
        header("Recording ready"),
        heading("Missed the session? Watch it in your own time", spacer=False),
        hero_image(*WIND),
        paragraph(f"Hi {NAME},"),
        paragraph(f"The recording of <strong>{TITLE}</strong> is ready. Chapter links take you straight to the part you need."),
        button("Watch the recording", utm(SITE, CID, "followup-missed")),
        divider(),
        footer(),
    ],
}

out = CAMPAIGN / "emails"
out.mkdir(parents=True, exist_ok=True)
for message_id, blocks in EMAILS.items():
    m = msg(message_id)
    subject = m.get("subject") or next(iter(m["subject_variants"].values()))
    html = document(subject, m["preheader"], blocks)
    (out / f"{message_id}.html").write_text(html, encoding="utf-8")
    print(f"built {message_id}.html ({len(html.encode('utf-8')) / 1024:.1f} KB)")
