"""Modular, responsive email blocks.

Table-based layout with inline styles, because Outlook (Word rendering engine) ignores most
modern CSS. One <style> block holds only what cannot be inlined: the mobile media query and
dark-mode overrides. Every block returns an HTML string; an email is a list of blocks.
"""
from html import escape
from urllib.parse import urlencode, urlsplit, urlunsplit, parse_qsl

# Palette and shapes follow xweather.com's public site (read 18 Nov 2026): near-black ink,
# cool grey ground, dark navy primary button, mint secondary, 8 px radius, light large headings,
# monospace eyebrows. Vaisala's own typefaces are not web-safe in email, so system fallbacks are used.
INK = "#09151C"      # body text, hero band
NAVY = "#0E1F2C"     # primary button
ACCENT = "#27455C"   # text links
MINT = "#D3EBEA"     # secondary surface
MUTED = "#556079"
LINE = "#D9E0E6"
BG = "#F2F4F6"
FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif"
MONO = "SFMono-Regular, Menlo, Consolas, 'Courier New', monospace"


def utm(url, campaign_id, message_id):
    """Add the UTM convention from tracking-plan.json to an owned link."""
    parts = urlsplit(url)
    query = dict(parse_qsl(parts.query))
    query.update({"utm_source": "customerio", "utm_medium": "email",
                  "utm_campaign": campaign_id, "utm_content": message_id})
    return urlunsplit((parts.scheme, parts.netloc, parts.path, urlencode(query), parts.fragment))


def document(title, preheader, body_blocks):
    """Wrap blocks in a full email document with a hidden preheader."""
    body = "\n".join(body_blocks)
    return f"""<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>{escape(title)}</title>
<style>
  @media only screen and (max-width: 620px) {{
    .container {{ width: 100% !important; }}
    .px {{ padding-left: 20px !important; padding-right: 20px !important; }}
    .btn a {{ display: block !important; text-align: center !important; }}
    .hero-h {{ font-size: 28px !important; }}
  }}
  @media (prefers-color-scheme: dark) {{
    .bg {{ background: #09151C !important; }}
    .card {{ background: #0E1F2C !important; }}
    .ink {{ color: #D9E0E6 !important; }}
    .muted {{ color: #859BA3 !important; }}
    .btn-cell {{ background: #D3EBEA !important; }}
    .btn-cell a {{ color: #09151C !important; }}
    .lnk {{ color: #D3EBEA !important; }}
  }}
</style>
</head>
<body style="margin:0; padding:0; background:{BG};" class="bg">
<div style="display:none; max-height:0; overflow:hidden; mso-hide:all;">{escape(preheader)}&#8199;&#65279;&#847; &#8199;&#65279;&#847; &#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:{BG};" class="bg">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="container card" style="width:600px; max-width:600px; background:#FFFFFF; border-radius:8px; overflow:hidden;">
{body}
</table>
</td></tr>
</table>
</body>
</html>
"""


def header(label):
    """Dark brand band: wordmark as text (no logo image), then a monospace eyebrow."""
    return f"""<tr><td class="px" style="padding:24px 40px 0; background:{INK}; font:bold 20px/1.1 {FONT}; letter-spacing:-.02em; color:#FFFFFF;"><span style="font:10px/1 {MONO}; letter-spacing:.14em; color:{LINE};">VAISALA</span><br>Xweather</td></tr>
<tr><td class="px" style="padding:36px 40px 6px; background:{INK}; font:13px/1.4 {MONO}; letter-spacing:-.02em; color:{LINE};">{escape(label)}</td></tr>"""


def heading(text):
    """Large, light headline on the dark band, as on xweather.com."""
    return f"""<tr><td class="px hero-h" style="padding:4px 40px 36px; background:{INK}; font:300 34px/1.15 {FONT}; letter-spacing:-1px; color:#FFFFFF;">{text}</td></tr>
<tr><td style="height:16px; font-size:0; line-height:0;">&nbsp;</td></tr>"""


def paragraph(text):
    """Text may contain Liquid; it is not escaped. Keep user data out of block code."""
    return f"""<tr><td class="px ink" style="padding:8px 40px; font:16px/1.55 {FONT}; color:{INK};">{text}</td></tr>"""


def bullets(items):
    rows = "".join(f'<li style="margin:0 0 6px;">{i}</li>' for i in items)
    return f"""<tr><td class="px ink" style="padding:4px 40px 8px; font:16px/1.55 {FONT}; color:{INK};"><ul style="margin:0; padding-left:20px;">{rows}</ul></td></tr>"""


def button(label, url):
    """Bulletproof button: a padded link inside a table cell, readable without images."""
    return f"""<tr><td class="px btn" style="padding:16px 40px 8px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td class="btn-cell" style="background:{NAVY}; border-radius:8px;"><a href="{url}" style="display:inline-block; padding:14px 24px; font:15px/1 {FONT}; color:#FFFFFF; text-decoration:none; border-radius:8px;">{escape(label)}</a></td>
</tr></table></td></tr>"""


def divider():
    return f"""<tr><td class="px" style="padding:16px 40px;"><div style="border-top:1px solid {LINE}; font-size:0; line-height:0;">&nbsp;</div></td></tr>"""


def footer(transactional=False):
    if transactional:
        note = ("You receive this email because you registered for this webinar. "
                "It is a service message about your registration.")
        links = ""
    else:
        note = "You receive this email because you subscribed to updates on events and webinars."
        links = ('<br><a href="{% manage_subscription_preferences_url %}" class="lnk" style="color:#556079;">Manage preferences</a>'
                 ' &middot; <a href="{% unsubscribe_url %}" class="lnk" style="color:#556079;">Unsubscribe</a>')
    return f"""<tr><td class="px muted" style="padding:8px 40px 32px; font:12px/1.5 {FONT}; color:{MUTED};">{note}{links}<br>Unofficial sample made for a job application. Not sent by Vaisala.</td></tr>"""
