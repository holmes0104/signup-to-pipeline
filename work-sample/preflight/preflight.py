"""Pre-send QA for a Customer.io campaign: one command, one report, no surprises after send.

Usage:
  python preflight/preflight.py campaigns/webinar-nurture            # static checks
  python preflight/preflight.py campaigns/webinar-nurture --links    # also request every link
  python preflight/preflight.py --domain praised.co                  # SPF and DMARC lookup only

Reads campaign.json (sender, audience, messages) and tracking-plan.json (events, attributes,
UTM convention). Prints a Markdown report. Exit code 1 if any check FAILs.
Standard library only. DNS lookups use DNS-over-HTTPS (dns.google) and send only the domain name.
"""
import argparse, json, re, sys, urllib.request
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, parse_qs

ROOT = Path(__file__).resolve().parents[1]
GMAIL_CLIP_KB = 102
SPAM_WORDS = ["guarantee", "act now", "winner", "100%", "risk-free", "urgent", "click here", "buy now"]
SAFE_TAGS = {"unsubscribe_url", "manage_subscription_preferences_url", "if", "elsif", "else", "endif",
             "unless", "endunless", "for", "endfor", "assign", "capture", "endcapture"}
SLUG = re.compile(r"^[a-z0-9_-]+$")


class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links, self.images, self.meta, self.hidden = [], [], {}, []
        self.lang = self.title = None
        self._in_title = False
        self._hidden_depth = 0
        self._a = None

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "html":
            self.lang = a.get("lang")
        elif tag == "title":
            self._in_title = True
        elif tag == "meta" and a.get("name"):
            self.meta[a["name"]] = a.get("content", "")
        elif tag == "a":
            self._a = {"href": a.get("href", ""), "text": ""}
        elif tag == "img":
            self.images.append(a)
        elif tag == "div" and "display:none" in (a.get("style") or "").replace(" ", ""):
            self._hidden_depth = 1
            self.hidden.append("")

    def handle_endtag(self, tag):
        if tag == "title":
            self._in_title = False
        elif tag == "a" and self._a is not None:
            self.links.append(self._a)
            self._a = None
        elif tag == "div" and self._hidden_depth:
            self._hidden_depth = 0

    def handle_data(self, data):
        if self._in_title:
            self.title = (self.title or "") + data
        if self._a is not None:
            self._a["text"] += data
        if self._hidden_depth and self.hidden:
            self.hidden[-1] += data


class Report:
    def __init__(self):
        self.rows = []

    def add(self, level, where, text):
        self.rows.append((level, where, text))

    def fails(self):
        return sum(1 for r in self.rows if r[0] == "FAIL")

    def render(self, title):
        counts = {k: sum(1 for r in self.rows if r[0] == k) for k in ("FAIL", "WARN", "PASS")}
        out = [f"# Preflight report: {title}", "",
               f"**{counts['FAIL']} FAIL · {counts['WARN']} WARN · {counts['PASS']} PASS**", "",
               "| Result | Where | Check |", "|---|---|---|"]
        order = {"FAIL": 0, "WARN": 1, "PASS": 2}
        for level, where, text in sorted(self.rows, key=lambda r: order[r[0]]):
            out.append(f"| {level} | {where} | {text.replace('|', '/')} |")
        out += ["", "Not checked by this script, needs a person: tone and claims, whether the segment matches the intent,",
                "send time, rendering in real inboxes (seed list), and sign-off from the campaign owner."]
        return "\n".join(out)


def liquid_vars(text):
    """Yield (expression, variable, has_default) for every {{ ... }} in text."""
    for m in re.finditer(r"\{\{\s*(.*?)\s*\}\}", text):
        expr = m.group(1)
        var = re.split(r"\s*\|", expr)[0].strip()
        yield expr, var, "default:" in expr.replace(" ", "")


def render_example(text, plan, trigger):
    """Replace Liquid with example values, to measure what a recipient actually sees."""
    def sub(m):
        var = re.split(r"\s*\|", m.group(1))[0].strip()
        scope, _, name = var.partition(".")
        src = plan["person_attributes"] if scope == "customer" else plan["events"].get(trigger, {}).get("properties", {})
        return str(src.get(name, {}).get("example", "xxxxxxxx"))
    return re.sub(r"\{\{\s*(.*?)\s*\}\}", sub, text)


def check_liquid(r, where, text, plan, trigger):
    attrs = plan["person_attributes"]
    props = plan["events"].get(trigger, {}).get("properties", {})
    for expr, var, has_default in liquid_vars(text):
        scope, _, name = var.partition(".")
        if scope == "customer":
            if name not in attrs:
                r.add("FAIL", where, f"`{{{{{expr}}}}}`: attribute `{name}` is not in the tracking plan")
            elif not has_default:
                r.add("FAIL", where, f"`{{{{{expr}}}}}` has no `default` fallback; empty for people without `{name}`")
        elif scope == "event":
            if name not in props:
                r.add("FAIL", where, f"`{{{{{expr}}}}}`: `{name}` is not a property of trigger event `{trigger}`")
        else:
            r.add("WARN", where, f"`{{{{{expr}}}}}`: unknown Liquid scope `{scope}`")
    for tag in re.findall(r"\{%-?\s*(\w+)", text):
        if tag not in SAFE_TAGS:
            r.add("WARN", where, f"Liquid tag `{{% {tag} %}}` is not on the known list; check it renders")


def check_subject(r, where, subject, plan, trigger):
    shown = render_example(subject, plan, trigger)
    check_liquid(r, where, subject, plan, trigger)
    n = len(shown)
    if n > 90:
        r.add("FAIL", where, f"Subject is {n} characters with example data; mobile inboxes cut at about 40-60")
    elif n > 60:
        r.add("WARN", where, f"Subject is {n} characters with example data; may be cut on mobile")
    else:
        r.add("PASS", where, f"Subject length {n} characters: \"{shown}\"")
    low = shown.lower()
    hits = [w for w in SPAM_WORDS if re.search(r"(?<!\w)" + re.escape(w) + r"(?!\w)", low)]
    if hits:
        r.add("WARN", where, f"Subject wording to review (pushy phrases): {', '.join(hits)}")
    if shown.count("!") > 1 or re.search(r"\b[A-Z]{4,}\b", shown):
        r.add("WARN", where, "Subject uses several exclamation marks or ALL-CAPS words")


def check_links(r, where, page, cfg, plan, message_id, request_links):
    conv = plan["utm_convention"]
    owned = set(cfg.get("owned_domains", []))
    checked = []
    if not page.links:
        r.add("WARN", where, "No links in the email")
    for link in page.links:
        href = link["href"].strip()
        label = (link["text"].strip() or href)[:40]
        if not href or href == "#":
            r.add("FAIL", where, f"Link \"{label}\" has an empty href")
            continue
        if href.startswith(("{{", "{%")):
            continue  # Liquid link, checked by check_liquid
        if href.startswith("mailto:"):
            continue
        if link["text"].strip().lower() in ("click here", "here", "link"):
            r.add("WARN", where, f"Link text \"{link['text'].strip()}\" says nothing about the destination")
        if re.search(r"\s", href):
            r.add("FAIL", where, f"Link \"{label}\" contains a space; encode it or fix the UTM value")
            continue
        parts = urlsplit(href)
        if parts.scheme != "https":
            r.add("FAIL", where, f"Link \"{label}\" is not HTTPS: {href}")
        q = {k: v[0] for k, v in parse_qs(parts.query).items()}
        if parts.netloc in owned:
            missing = [k for k in conv["required"] if k not in q]
            if missing:
                r.add("FAIL", where, f"Link \"{label}\" to an owned page is missing {', '.join(missing)}")
            else:
                bad = [f"{k}={q[k]} (expected {v})" for k, v in conv["fixed"].items() if q.get(k) != v]
                if SLUG.match(cfg["campaign_id"]) and q.get("utm_campaign") != cfg["campaign_id"]:
                    bad.append(f"utm_campaign={q.get('utm_campaign')} (expected {cfg['campaign_id']})")
                if "utm_content" in q and q["utm_content"] != message_id:
                    bad.append(f"utm_content={q['utm_content']} (expected {message_id})")
                bad += [f"{k}={v} breaks the naming rule" for k, v in q.items() if k.startswith("utm_") and not SLUG.match(v)]
                if bad:
                    r.add("FAIL", where, f"Link \"{label}\": " + "; ".join(bad))
                else:
                    r.add("PASS", where, f"Link \"{label}\" follows the UTM convention")
        checked.append(href)
    if request_links:
        for href in sorted(set(checked)):
            try:
                req = urllib.request.Request(href, headers={"User-Agent": "preflight-check/1.0"})
                with urllib.request.urlopen(req, timeout=15) as resp:
                    code = resp.status
            except urllib.error.HTTPError as e:
                code = e.code
            except Exception as e:  # network error
                r.add("WARN", where, f"Could not reach {href}: {e.__class__.__name__}")
                continue
            if code >= 400:
                r.add("FAIL", where, f"{href} returns HTTP {code}")
            else:
                r.add("PASS", where, f"{urlsplit(href).netloc}{urlsplit(href).path} returns HTTP {code}")


def check_message(r, cfg, plan, m, campaign_dir, request_links):
    mid = m["message_id"]
    trigger = cfg["trigger_event"]
    path = campaign_dir / m["file"]
    if not path.exists():
        r.add("FAIL", mid, f"Email file missing: {m['file']}")
        return
    html = path.read_text(encoding="utf-8")
    page = Page()
    page.feed(html)

    subjects = m.get("subject_variants") or {"": m.get("subject", "")}
    for variant, subject in subjects.items():
        if not subject:
            r.add("FAIL", mid, "No subject line")
            continue
        check_subject(r, f"{mid} subject {variant}".strip(), subject, plan, trigger)
    if m.get("subject_variants"):
        ab = m.get("ab_test") or {}
        if not ab.get("metric") or not ab.get("min_per_variant"):
            r.add("WARN", mid, "A/B variants without a stated metric and minimum sample per variant")
        else:
            r.add("PASS", mid, f"A/B test defined: {ab['metric']}, at least {ab['min_per_variant']} per variant")

    pre = m.get("preheader", "")
    if not pre:
        r.add("WARN", mid, "No preheader; inboxes will show the first body text instead")
    else:
        if not (35 <= len(pre) <= 110):
            r.add("WARN", mid, f"Preheader is {len(pre)} characters; aim for about 40-110")
        if not any(pre in h for h in page.hidden):
            r.add("WARN", mid, "Preheader in campaign.json does not match the hidden preheader in the HTML")
        else:
            r.add("PASS", mid, "Preheader present and matches the config")

    kb = len(html.encode("utf-8")) / 1024
    if kb >= GMAIL_CLIP_KB:
        r.add("FAIL", mid, f"HTML is {kb:.0f} KB; Gmail clips messages over {GMAIL_CLIP_KB} KB, hiding the footer")
    elif kb >= 90:
        r.add("WARN", mid, f"HTML is {kb:.0f} KB; close to Gmail's {GMAIL_CLIP_KB} KB clipping limit")
    else:
        r.add("PASS", mid, f"HTML size {kb:.1f} KB")

    if not page.lang:
        r.add("WARN", mid, "`<html>` has no lang attribute (screen readers)")
    if "viewport" not in page.meta:
        r.add("FAIL", mid, "No viewport meta tag; mobile layout will not scale")
    if "color-scheme" not in page.meta:
        r.add("WARN", mid, "No color-scheme meta; dark-mode clients may invert colours unpredictably")

    for img in page.images:
        src = img.get("src", "")
        if img.get("alt") is None:
            r.add("FAIL", mid, f"Image without alt text: {src[:60]}")
        if not img.get("width"):
            r.add("WARN", mid, f"Image without width attribute (Outlook may show it full size): {src[:60]}")
        if src.startswith("http:"):
            r.add("FAIL", mid, f"Image loaded over HTTP: {src[:60]}")

    check_liquid(r, mid, html, plan, trigger)
    check_links(r, mid, page, cfg, plan, mid, request_links)

    if m.get("transactional"):
        r.add("PASS", mid, "Transactional: no unsubscribe needed; content limited to the registration")
    else:
        if "{% unsubscribe_url %}" not in html:
            r.add("FAIL", mid, "No `{% unsubscribe_url %}` link; required for marketing email (and Gmail/Yahoo bulk-sender rules)")
        else:
            r.add("PASS", mid, "Unsubscribe link present")
        if "{% manage_subscription_preferences_url %}" not in html:
            r.add("WARN", mid, "No preference-centre link; people can only unsubscribe from everything")


def check_campaign(r, cfg, plan):
    s = cfg.get("sender", {})
    dom = s.get("from_email", "@").split("@")[-1]
    if dom not in s.get("authenticated_domains", []):
        r.add("FAIL", "sender", f"From domain `{dom}` is not in the authenticated sending domains")
    else:
        r.add("PASS", "sender", f"From domain `{dom}` is an authenticated sending domain")
    if not s.get("reply_to"):
        r.add("WARN", "sender", "No reply-to address; replies go to the sending address")
    trigger = cfg.get("trigger_event")
    if trigger not in plan["events"]:
        r.add("FAIL", "campaign", f"Trigger event `{trigger}` is not in the tracking plan")
    else:
        r.add("PASS", "campaign", f"Trigger event `{trigger}` is in the tracking plan")
    if any(not m.get("transactional") for m in cfg["messages"]):
        if not cfg.get("subscription_topic"):
            r.add("FAIL", "campaign", "Marketing messages without a subscription topic")
        if "consent_marketing_email" not in (cfg.get("nurture_filter") or ""):
            r.add("FAIL", "campaign", "Marketing messages are not filtered on `consent_marketing_email`")
        else:
            r.add("PASS", "campaign", "Marketing messages require marketing consent")
    if not SLUG.match(cfg.get("campaign_id", "")):
        r.add("FAIL", "campaign", "Campaign ID (used as utm_campaign) is not a lowercase slug; UTM reports will split")


def doh(name, rtype="TXT"):
    url = f"https://dns.google/resolve?name={name}&type={rtype}"
    with urllib.request.urlopen(url, timeout=15) as resp:
        data = json.load(resp)
    return [a["data"].strip('"').replace('" "', "") for a in data.get("Answer", [])]


def check_domain(r, domain, selector=None):
    spf = [t for t in doh(domain) if t.lower().startswith("v=spf1")]
    if len(spf) == 1:
        r.add("PASS", domain, f"SPF: {spf[0]}")
    elif not spf:
        r.add("FAIL", domain, "No SPF record")
    else:
        r.add("FAIL", domain, "More than one SPF record; receivers treat this as an error")
    dmarc = [t for t in doh("_dmarc." + domain) if t.lower().startswith("v=dmarc1")]
    inherited = ""
    org = ".".join(domain.split(".")[-2:])  # simple organisational domain; enough for .com/.co/.fi style names
    if not dmarc and org != domain:
        dmarc = [t for t in doh("_dmarc." + org) if t.lower().startswith("v=dmarc1")]
        inherited = f" (inherited from {org})"
    if not dmarc:
        r.add("FAIL", domain, "No DMARC record; Gmail and Yahoo require one for bulk senders")
    else:
        tags = dict(p.strip().split("=", 1) for p in dmarc[0].split(";") if "=" in p)
        policy = tags.get("sp", tags.get("p", "?")) if inherited else tags.get("p", "?")
        level = "PASS" if policy in ("quarantine", "reject") else "WARN"
        note = "" if level == "PASS" else " (monitoring only; move to quarantine once reports are clean)"
        r.add(level, domain, f"DMARC policy {policy}{inherited}{note}; reports to {tags.get('rua', 'nobody')}")
    if selector:
        dkim = [t for t in doh(f"{selector}._domainkey.{domain}") if "p=" in t]
        r.add("PASS" if dkim else "FAIL", domain, f"DKIM selector `{selector}` " + ("found" if dkim else "not found"))


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("campaign", nargs="?", help="campaign folder containing campaign.json")
    ap.add_argument("--links", action="store_true", help="request every link and fail on HTTP errors")
    ap.add_argument("--domain", help="only look up SPF and DMARC for this sending domain")
    ap.add_argument("--dkim-selector", help="DKIM selector to look up with --domain")
    ap.add_argument("--out", help="also write the report to this file")
    a = ap.parse_args()
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    r = Report()
    if a.domain:
        check_domain(r, a.domain, a.dkim_selector)
        title = a.domain
    else:
        if not a.campaign:
            ap.error("give a campaign folder or --domain")
        cdir = Path(a.campaign).resolve()
        cfg = json.loads((cdir / "campaign.json").read_text(encoding="utf-8"))
        plan = json.loads((ROOT / "tracking-plan.json").read_text(encoding="utf-8"))
        check_campaign(r, cfg, plan)
        for m in cfg["messages"]:
            check_message(r, cfg, plan, m, cdir, a.links)
        title = cfg.get("name", cdir.name)
    text = r.render(title)
    print(text)
    if a.out:
        Path(a.out).write_text(text + "\n", encoding="utf-8")
    sys.exit(1 if r.fails() else 0)


if __name__ == "__main__":
    main()
