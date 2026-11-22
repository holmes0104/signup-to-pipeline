// Browser port of work-sample/preflight/preflight.py (same checks, minus live link requests).
(function () {
  const D = window.DEMO_DATA, plan = D.plan;
  const GMAIL_CLIP_KB = 102;
  const SPAM = ["guarantee", "act now", "winner", "100%", "risk-free", "urgent", "click here", "buy now"];
  const SAFE_TAGS = new Set(["unsubscribe_url", "manage_subscription_preferences_url", "if", "elsif", "else", "endif", "unless", "endunless", "for", "endfor", "assign", "capture", "endcapture"]);
  const SLUG = /^[a-z0-9_-]+$/;
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const PLACEHOLDER = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="200" viewBox="0 0 600 200"><rect width="600" height="200" fill="#1B3A4B"/><path d="M0 150 C120 110 200 160 320 120 S500 90 600 115 V200 H0Z" fill="#24506A"/><path d="M0 170 C140 140 260 185 380 150 S520 135 600 150 V200 H0Z" fill="#3860BE" opacity=".55"/></svg>');
  const fmt = s => esc(s).replace(/`([^`]+)`/g, "<code>$1</code>");

  let work = null, rows = [], filter = "all";

  function load(name) {
    const c = D.campaigns[name];
    work = { name, cfg: JSON.parse(JSON.stringify(c.cfg)), emails: { ...c.emails } };
    $("pf-message").innerHTML = work.cfg.messages.map((m, n) => `<option value="${n}">${esc(m.message_id)}</option>`).join("");
    showMessage(0);
  }
  function current() { return work.cfg.messages[+$("pf-message").value || 0]; }
  function showMessage(n) {
    $("pf-message").value = n;
    const m = work.cfg.messages[n];
    $("pf-subject").value = m.subject_variants ? m.subject_variants.A : (m.subject || "");
    $("pf-subject").disabled = false;
    $("pf-html").value = work.emails[m.file];
    preview();
  }
  function saveEdits() {
    const m = current();
    if (m.subject_variants) m.subject_variants.A = $("pf-subject").value; else m.subject = $("pf-subject").value;
    work.emails[m.file] = $("pf-html").value;
  }

  const liquidVars = text => [...text.matchAll(/\{\{\s*(.*?)\s*\}\}/g)].map(m => {
    const expr = m[1], v = expr.split(/\s*\|/)[0].trim();
    return { expr, v, def: expr.replace(/\s/g, "").includes("default:") };
  });
  function example(text, trigger) {
    return text.replace(/\{\{\s*(.*?)\s*\}\}/g, (_, e) => {
      const [scope, name] = e.split(/\s*\|/)[0].trim().split(".");
      const src = scope === "customer" ? plan.person_attributes : ((plan.events[trigger] || {}).properties || {});
      return (src[name] && src[name].example != null) ? String(src[name].example) : "xxxxxxxx";
    });
  }
  let pvTimer = null;
  function preview() { clearTimeout(pvTimer); pvTimer = setTimeout(renderPreview, 60); }
  function renderPreview() {
    // Sample image hosts do not exist, so the preview draws a neutral placeholder; the checks still read the real HTML.
    const html = example($("pf-html").value, work.cfg.trigger_event).replace(/\{%[^%]*%\}/g, "#")
      .replace(/(<img\b[^>]*?\ssrc=)(["'])[^"']*\2/gi, `$1"${PLACEHOLDER}"`);
    const w = $("pf-frame").clientWidth, fit = w && w < 650 ? `<style>html{zoom:${(w / 650).toFixed(3)}}</style>` : "";
    $("pf-frame").srcdoc = fit && /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, m => m + fit) : fit + html;
  }

  function checkLiquid(add, where, text, trigger) {
    const attrs = plan.person_attributes, props = (plan.events[trigger] || {}).properties || {};
    for (const { expr, v, def } of liquidVars(text)) {
      const [scope, name] = [v.split(".")[0], v.split(".").slice(1).join(".")];
      if (scope === "customer") {
        if (!(name in attrs)) add("FAIL", where, `\`{{${expr}}}\`: attribute \`${name}\` is not in the tracking plan`);
        else if (!def) add("FAIL", where, `\`{{${expr}}}\` has no \`default\` fallback; empty for people without \`${name}\``);
      } else if (scope === "event") {
        if (!(name in props)) add("FAIL", where, `\`{{${expr}}}\`: \`${name}\` is not a property of trigger event \`${trigger}\``);
      } else add("WARN", where, `\`{{${expr}}}\`: unknown Liquid scope \`${scope}\``);
    }
    for (const m of text.matchAll(/\{%-?\s*(\w+)/g)) if (!SAFE_TAGS.has(m[1])) add("WARN", where, `Liquid tag \`{% ${m[1]} %}\` is not on the known list; check it renders`);
  }

  function checkSubject(add, where, subject, trigger) {
    const shown = example(subject, trigger);
    checkLiquid(add, where, subject, trigger);
    const n = shown.length;
    if (n > 90) add("FAIL", where, `Subject is ${n} characters with example data; mobile inboxes cut at about 40-60`);
    else if (n > 60) add("WARN", where, `Subject is ${n} characters with example data; may be cut on mobile`);
    else add("PASS", where, `Subject length ${n} characters: "${shown}"`);
    const low = shown.toLowerCase();
    const hits = SPAM.filter(w => new RegExp("(?<!\\w)" + w.replace(/[.*+?^${}()|[\]\\%]/g, "\\$&") + "(?!\\w)").test(low));
    if (hits.length) add("WARN", where, `Subject wording to review (pushy phrases): ${hits.join(", ")}`);
    if ((shown.match(/!/g) || []).length > 1 || /\b[A-Z]{4,}\b/.test(shown)) add("WARN", where, "Subject uses several exclamation marks or ALL-CAPS words");
  }

  function checkLinks(add, where, doc, cfg, mid) {
    const conv = plan.utm_convention, owned = new Set(cfg.owned_domains || []);
    const links = [...doc.querySelectorAll("a")];
    if (!links.length) add("WARN", where, "No links in the email");
    for (const a of links) {
      const href = (a.getAttribute("href") || "").trim(), text = a.textContent.trim(), label = (text || href).slice(0, 40);
      if (!href || href === "#") { add("FAIL", where, `Link "${label}" has an empty href`); continue; }
      if (href.startsWith("{{") || href.startsWith("{%") || href.startsWith("mailto:")) continue;
      if (["click here", "here", "link"].includes(text.toLowerCase())) add("WARN", where, `Link text "${text}" says nothing about the destination`);
      if (/\s/.test(href)) { add("FAIL", where, `Link "${label}" contains a space; encode it or fix the UTM value`); continue; }
      let u; try { u = new URL(href); } catch { add("FAIL", where, `Link "${label}" is not a valid URL`); continue; }
      if (u.protocol !== "https:") add("FAIL", where, `Link "${label}" is not HTTPS: ${href}`);
      if (owned.has(u.host)) {
        const q = Object.fromEntries(u.searchParams);
        const missing = conv.required.filter(k => !(k in q));
        if (missing.length) { add("FAIL", where, `Link "${label}" to an owned page is missing ${missing.join(", ")}`); continue; }
        const bad = Object.entries(conv.fixed).filter(([k, v]) => q[k] !== v).map(([k, v]) => `${k}=${q[k]} (expected ${v})`);
        if (SLUG.test(cfg.campaign_id) && q.utm_campaign !== cfg.campaign_id) bad.push(`utm_campaign=${q.utm_campaign} (expected ${cfg.campaign_id})`);
        if ("utm_content" in q && q.utm_content !== mid) bad.push(`utm_content=${q.utm_content} (expected ${mid})`);
        Object.entries(q).forEach(([k, v]) => { if (k.startsWith("utm_") && !SLUG.test(v)) bad.push(`${k}=${v} breaks the naming rule`); });
        if (bad.length) add("FAIL", where, `Link "${label}": ` + bad.join("; "));
        else add("PASS", where, `Link "${label}" follows the UTM convention`);
      }
    }
  }

  function checkMessage(add, cfg, m, html) {
    const mid = m.message_id, trigger = cfg.trigger_event;
    const doc = new DOMParser().parseFromString(html, "text/html");
    const subjects = m.subject_variants || { "": m.subject || "" };
    for (const [variant, subject] of Object.entries(subjects)) {
      if (!subject) { add("FAIL", mid, "No subject line"); continue; }
      checkSubject(add, `${mid} subject ${variant}`.trim(), subject, trigger);
    }
    if (m.subject_variants) {
      const ab = m.ab_test || {};
      if (!ab.metric || !ab.min_per_variant) add("WARN", mid, "A/B variants without a stated metric and minimum sample per variant");
      else add("PASS", mid, `A/B test defined: ${ab.metric}, at least ${ab.min_per_variant} per variant`);
    }
    const pre = m.preheader || "";
    const hidden = [...doc.querySelectorAll("div")].filter(d => (d.getAttribute("style") || "").replace(/\s/g, "").includes("display:none")).map(d => d.textContent);
    if (!pre) add("WARN", mid, "No preheader; inboxes will show the first body text instead");
    else {
      if (pre.length < 35 || pre.length > 110) add("WARN", mid, `Preheader is ${pre.length} characters; aim for about 40-110`);
      if (!hidden.some(h => h.includes(pre))) add("WARN", mid, "Preheader in the campaign set-up does not match the hidden preheader in the HTML");
      else add("PASS", mid, "Preheader present and matches the set-up");
    }
    const kb = new Blob([html]).size / 1024;
    if (kb >= GMAIL_CLIP_KB) add("FAIL", mid, `HTML is ${kb.toFixed(0)} KB; Gmail clips messages over ${GMAIL_CLIP_KB} KB, hiding the footer`);
    else if (kb >= 90) add("WARN", mid, `HTML is ${kb.toFixed(0)} KB; close to Gmail's ${GMAIL_CLIP_KB} KB clipping limit`);
    else add("PASS", mid, `HTML size ${kb.toFixed(1)} KB`);
    if (!/<html[^>]*\slang=/i.test(html)) add("WARN", mid, "`<html>` has no lang attribute (screen readers)");
    const meta = n => doc.querySelector(`meta[name="${n}"]`);
    if (!meta("viewport")) add("FAIL", mid, "No viewport meta tag; mobile layout will not scale");
    if (!meta("color-scheme")) add("WARN", mid, "No color-scheme meta; dark-mode clients may invert colours unpredictably");
    for (const img of doc.querySelectorAll("img")) {
      const src = (img.getAttribute("src") || "").slice(0, 60);
      if (!img.hasAttribute("alt")) add("FAIL", mid, `Image without alt text: ${src}`);
      if (!img.getAttribute("width")) add("WARN", mid, `Image without width attribute (Outlook may show it full size): ${src}`);
      if (src.startsWith("http:")) add("FAIL", mid, `Image loaded over HTTP: ${src}`);
    }
    checkLiquid(add, mid, html, trigger);
    checkLinks(add, mid, doc, cfg, mid);
    if (m.transactional) add("PASS", mid, "Transactional: no unsubscribe needed; content limited to the registration");
    else {
      if (!html.includes("{% unsubscribe_url %}")) add("FAIL", mid, "No `{% unsubscribe_url %}` link; required for marketing email and by Gmail and Yahoo bulk-sender rules");
      else add("PASS", mid, "Unsubscribe link present");
      if (!html.includes("{% manage_subscription_preferences_url %}")) add("WARN", mid, "No preference-centre link; people can only unsubscribe from everything");
    }
  }

  function checkCampaign(add, cfg) {
    const s = cfg.sender || {}, dom = (s.from_email || "@").split("@").pop();
    if (!(s.authenticated_domains || []).includes(dom)) add("FAIL", "sender", `From domain \`${dom}\` is not an authenticated sending domain`);
    else add("PASS", "sender", `From domain \`${dom}\` is an authenticated sending domain`);
    if (!s.reply_to) add("WARN", "sender", "No reply-to address; replies go to the sending address");
    if (!(cfg.trigger_event in plan.events)) add("FAIL", "automation", `Trigger event \`${cfg.trigger_event}\` is not in the tracking plan`);
    else add("PASS", "automation", `Trigger event \`${cfg.trigger_event}\` is in the tracking plan`);
    if (cfg.messages.some(m => !m.transactional)) {
      if (!cfg.subscription_topic) add("FAIL", "automation", "Marketing messages without a subscription topic");
      if (!(cfg.nurture_filter || "").includes("consent_marketing_email")) add("FAIL", "automation", "Marketing messages are not filtered on `consent_marketing_email`");
      else add("PASS", "automation", "Marketing messages require marketing consent");
    }
    if (!SLUG.test(cfg.campaign_id || "")) add("FAIL", "automation", "Campaign ID (used as utm_campaign) is not a lowercase slug; UTM reports will split");
  }

  function run() {
    saveEdits();
    rows = [];
    const add = (l, w, t) => rows.push([l, w, t]);
    checkCampaign(add, work.cfg);
    for (const m of work.cfg.messages) checkMessage(add, work.cfg, m, work.emails[m.file]);
    const order = { FAIL: 0, WARN: 1, PASS: 2 };
    rows.sort((a, b) => order[a[0]] - order[b[0]]);
    const c = k => rows.filter(r => r[0] === k).length;
    const f = c("FAIL"), w = c("WARN");
    const v = $("pf-verdict");
    v.textContent = f ? `${f} ${f === 1 ? "problem" : "problems"} to fix before sending` : w ? `Ready to send, ${w} to review` : "Ready to send";
    v.className = f ? "bad" : "ok";
    $("pf-filters").innerHTML = [["all", "All", rows.length], ["FAIL", "Fail", f], ["WARN", "Warn", w], ["PASS", "Pass", c("PASS")]]
      .map(([k, l, n]) => `<button type="button" role="radio" data-f="${k}" aria-checked="${k === filter}">${l}<span class="n">${n}</span></button>`).join("");
    draw();
    $("pf-live").classList.remove("busy");
  }
  function draw() {
    const shown = rows.filter(r => filter === "all" || r[0] === filter);
    $("pf-rows").innerHTML = shown.map(([l, w, t]) => `<li><span class="lvl c-${l}">${l}</span><span>${fmt(t)}</span><span class="where">${esc(w)}</span></li>`).join("")
      || `<li class="empty">Nothing here.</li>`;
  }

  // DNS
  async function doh(name, type = "TXT") {
    const r = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${type}`);
    const j = await r.json();
    return (j.Answer || []).map(a => a.data.replace(/^"|"$/g, "").replace(/" "/g, ""));
  }
  async function checkDomain(domain, sel) {
    const out = [], add = (l, t) => out.push([l, t]);
    const spf = (await doh(domain)).filter(t => t.toLowerCase().startsWith("v=spf1"));
    if (spf.length === 1) add("PASS", `SPF: ${spf[0]}`); else if (!spf.length) add("FAIL", "No SPF record"); else add("FAIL", "More than one SPF record; receivers treat this as an error");
    let dmarc = (await doh("_dmarc." + domain)).filter(t => t.toLowerCase().startsWith("v=dmarc1")), inherited = "";
    const org = domain.split(".").slice(-2).join(".");
    if (!dmarc.length && org !== domain) { dmarc = (await doh("_dmarc." + org)).filter(t => t.toLowerCase().startsWith("v=dmarc1")); inherited = ` (inherited from ${org})`; }
    if (!dmarc.length) add("FAIL", "No DMARC record; Gmail and Yahoo require one for bulk senders");
    else {
      const tags = Object.fromEntries(dmarc[0].split(";").filter(p => p.includes("=")).map(p => p.trim().split(/=(.*)/s).slice(0, 2)));
      const policy = inherited ? (tags.sp || tags.p || "?") : (tags.p || "?");
      const ok = ["quarantine", "reject"].includes(policy);
      add(ok ? "PASS" : "WARN", `DMARC policy ${policy}${inherited}${ok ? "" : " (monitoring only; move to quarantine once reports are clean)"}; reports to ${tags.rua || "nobody"}`);
    }
    if (sel) { const dk = (await doh(`${sel}._domainkey.${domain}`)).filter(t => t.includes("p=")); add(dk.length ? "PASS" : "FAIL", `DKIM selector \`${sel}\` ${dk.length ? "found" : "not found"}`); }
    return out;
  }

  $("pf-campaigns").onclick = e => {
    const b = e.target.closest("button"); if (!b) return;
    document.querySelectorAll("#pf-campaigns button").forEach(x => x.setAttribute("aria-checked", x === b));
    filter = "all"; load(b.dataset.c); run();
  };
  $("pf-message").onchange = e => { saveEdits(); showMessage(+e.target.value); };
  $("pf-reset").onclick = () => { load(work.name); run(); };
  const live = () => { $("pf-live").classList.add("busy"); clearTimeout(window.__pv); window.__pv = setTimeout(run, 450); };
  $("pf-html").addEventListener("input", live);
  $("pf-subject").addEventListener("input", live);
  document.querySelector(".ed-tabs").onclick = e => {
    const b = e.target.closest("button"); if (!b) return;
    document.querySelectorAll(".ed-tabs button").forEach(x => x.setAttribute("aria-selected", x === b));
    const html = b.dataset.v === "html";
    $("pf-html").hidden = !html; $("pf-frame").hidden = html;
    if (html) $("pf-html").focus(); else preview();
  };
  $("pf-filters").onclick = e => {
    const b = e.target.closest("button"); if (!b) return; filter = b.dataset.f;
    document.querySelectorAll("#pf-filters button").forEach(x => x.setAttribute("aria-checked", x === b)); draw();
  };
  $("dns-form").onsubmit = async e => {
    e.preventDefault();
    const d = $("dns-domain").value.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, ""), s = $("dns-sel").value.trim();
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(d)) { $("dns-rows").innerHTML = `<li class="empty">Enter a domain name such as example.com.</li>`; return; }
    $("dns-rows").innerHTML = `<li class="empty">Looking up ${esc(d)}…</li>`;
    try {
      const out = await checkDomain(d, s);
      $("dns-rows").innerHTML = out.map(([l, t]) => `<li><span class="lvl c-${l}">${l}</span><span>${fmt(t)}</span></li>`).join("");
    } catch (err) { $("dns-rows").innerHTML = `<li class="empty">The lookup failed (${esc(err.message)}). Check the connection and try again.</li>`; }
  };

  document.addEventListener("viewchange", e => { if (e.detail === "preflight") preview(); });
  window.addEventListener("resize", () => { clearTimeout(window.__rz); window.__rz = setTimeout(preview, 200); });

  load("broken-example");
  run();
})();
