// Lifecycle replay. All people, companies, IDs and amounts are fictional.
(function () {
  const NODES = [["web", "Website"], ["product", "Product / API"], ["segment", "Segment"], ["cio", "Customer.io"], ["sf", "Salesforce"], ["dd", "Attribution"]];

  const PEOPLE = {
    laura: {
      name: "Laura", tag: "Developer at Example Air", path: "Free tier to enterprise",
      deal: 48000, dealName: "Example Air: weather API, enterprise volume",
      steps: [
        { day: "Day 0", title: "Clicks a LinkedIn ad", what: "Lands on the weather API page. Not signed in, so she is anonymous.", nodes: ["web", "segment"],
          event: `analytics.page("Weather API", {\n  path: "/products/weather-api"\n})\n// UTM tags on the ad link become context.campaign:\n// source: linkedin · medium: paid_social\n// name: api-aviation-2026-q4`,
          cio: [["idle", "Not a known person yet."], ["", "The page view is stored against an anonymous ID."]],
          sf: [["idle", "No record."]],
          why: "If the ad link has no UTM tags, this first touch is lost. The ad then gets no credit for the deal later." },
        { day: "Day 0", title: "Creates a free Developer account", what: "15,000 accesses a month, no card. Sign-up happens in the product, not on a web form.", nodes: ["product", "segment", "cio"],
          event: `analytics.identify("u_81234", {\n  email: "laura@example-air.example",\n  first_name: "Laura",\n  plan: "developer"\n})\nanalytics.group("acc_example_air", {\n  name: "Example Air", industry: "aviation"\n})\nanalytics.track("account_created", { plan: "developer" })`,
          cio: [["act", "Person created. Her earlier anonymous page view now belongs to her."], ["act", "Enters automation: Developer activation"]],
          mail: ["Your API key, and a first call in three lines", "Welcome · sent now"],
          sf: [["idle", "No record. A free sign-up is not yet a sales lead."]],
          why: "identify joins the anonymous ad click to Laura. group ties her to a company, which B2B attribution needs. Without these two calls, her record starts at sign-up." },
        { day: "Day 1", title: "Makes her first API call", what: "The product sends one milestone event, not every API call.", nodes: ["product", "segment", "cio"],
          event: `analytics.track("first_api_call", {\n  endpoint: "conditions"\n})`,
          cio: [["act", "Goal reached. She exits Developer activation."], ["", "The planned \"Quick start\" and \"Stuck?\" emails are not sent."]],
          sf: [["idle", "No record."]],
          why: "Exit rules matter as much as triggers. Without this exit, Laura gets a \"Stuck?\" email after she has already succeeded." },
        { day: "Day 18", title: "Uses 80% of the free monthly quota", what: "12,000 of 15,000 accesses. The free service pauses at the limit.", nodes: ["product", "segment", "cio"],
          event: `analytics.track("usage_threshold_reached", {\n  percent: 80,\n  accesses_this_month: 12000,\n  monthly_limit: 15000\n})`,
          cio: [["act", "Enters automation: Free tier limit"]],
          mail: ["You have used 80% of this month's free accesses", "Shows the €300 plan and \"Need more volume? Talk to us\""],
          sf: [["idle", "No record."]],
          why: "This message helps her, because the service would stop. It depends on a daily usage feed from the product. The website alone cannot see API usage." },
        { day: "Day 19", title: "Visits pricing three times", what: "Work email, target industry, high usage, pricing interest.", nodes: ["web", "segment", "cio", "sf"],
          event: `analytics.page("Pricing", { path: "/pricing" })   // x3 in 7 days\n\n// Customer.io segment rule:\n// email domain is not personal\n// AND usage_percent >= 80\n// AND pricing views >= 2 in 7 days`,
          cio: [["act", "Joins segment: Product-qualified lead"], ["", "lifecycle_stage = pql. Upgrade emails stop, so sales and marketing do not send mixed messages."]],
          sf: [["act", "Lead created: Laura, Example Air"], ["", "Lead Source: Product sign-up · Status: PQL · routed to the aviation account executive"]],
          why: "This is the hand-off line between the two sales motions. The rule needs agreement with Sales and RevOps, and a review against what actually converts." },
        { day: "Day 26", title: "Demo with sales; opportunity opened", what: "Sales converts the Lead and opens an opportunity.", nodes: ["sf", "cio", "dd"],
          event: `// No tracking call. The change happens in Salesforce,\n// and the sync carries it into Customer.io.\nhas_open_opportunity: true`,
          cio: [["act", "Synced attribute has_open_opportunity = true"], ["", "Excluded from upgrade and nurture automations while sales owns the deal."]],
          sf: [["act", "Lead converted → Contact + Account + Opportunity"], ["", "Opportunity: €48,000 · Stage: Discovery"]],
          why: "Lead conversion changes the record type. A sync that only reads Leads would lose Laura at this step. The sync must follow Contacts too." },
      ],
      touches: [["LinkedIn ad click", "first"], ["Free sign-up", ""], ["Quota email click", ""], ["Pricing visits: Lead created (PQL)", "lead"], ["Demo: opportunity created", "opp"]],
    },

    jukka: {
      name: "Jukka", tag: "Operations lead at Example Energy", path: "Webinar to demo",
      deal: 36000, dealName: "Example Energy: wind forecasts",
      steps: [
        { day: "Day 0", title: "Clicks the monthly newsletter", what: "A known subscriber with marketing consent.", nodes: ["cio", "web", "segment"],
          event: `analytics.page("Webinar: wind forecasts", {\n  path: "/webinars/wind-forecasts"\n})\n// utm_source=customerio · utm_medium=email\n// utm_campaign=newsletter-2026-11`,
          cio: [["act", "Click recorded on the newsletter broadcast."]],
          sf: [["idle", "No change."]],
          why: "Fixed UTM values (lowercase, set list of sources) let every report group email clicks the same way." },
        { day: "Day 0", title: "Registers for the webinar", what: "The webinar platform sends the registration through Segment.", nodes: ["segment", "cio", "sf"], breakable: true,
          event: `analytics.track("webinar_registered", {\n  webinar_id: "wx-wind-2026-12",\n  webinar_title: "Wind forecasts for operators",\n  webinar_start_at: "2026-12-10T13:00:00Z"\n})`,
          eventBroken: `analytics.identify("u_55102", {\n  email: "jukka@example-energy.example",\n  country: "Suomi"  // free-text field\n})\nanalytics.track("webinar_registered", {\n  webinar_id: "wx-wind-2026-12"\n})`,
          cio: [["act", "Enters automation: Webinar nurture"]],
          mail: ["You're registered: Wind forecasts for operators", "Confirmation · transactional, so every registrant gets it"],
          sf: [["act", "Lead created: Jukka, Example Energy"], ["act", "Campaign Member added to \"2026-12 Wind webinar\""], ["", "Status: Registered"]],
          sfBroken: { err: `{\n  "errorCode": "INVALID_OR_NULL_FOR_RESTRICTED_PICKLIST",\n  "message": "Country: bad value for restricted\n    picklist field: Suomi",\n  "fields": ["Country__c"]\n}`,
            fix: "Fix at the source: the form sends ISO country codes from a dropdown. Map old values (Suomi → FI). Backfill the rejected records. Alert on sync errors the same day." },
          why: "Two systems receive one registration. They need one shared ID, or you get duplicates." },
        { day: "Day 8", title: "Reminder, 24 hours before", what: "Consent is checked again before any marketing message.", nodes: ["cio"],
          event: `// No new event. A time-based step in the automation:\n// wait until webinar_start_at minus 24 h`,
          cio: [["act", "A/B test on the subject line, 50/50 split"], ["", "Metric: click-to-join rate · at least 400 people per variant"]],
          mail: ["Jukka, your seat for tomorrow is saved", "Variant B · personalised with a fallback"],
          sf: [["idle", "No change."]],
          why: "Test one variable at a time and decide the metric before the send. Otherwise any result looks like a win." },
        { day: "Day 9", title: "Attends for 41 minutes", what: "The platform reports attendance after the session.", nodes: ["segment", "cio", "sf"],
          event: `analytics.track("webinar_attended", {\n  webinar_id: "wx-wind-2026-12",\n  minutes_watched: 41\n})`,
          cio: [["act", "Branch: attended"]],
          mail: ["Slides, recording and the next step", "Follow-up for attendees"],
          sf: [["act", "Campaign Member status: Attended"], ["", "Counts as a response, because Attended is set as a Responded status"]],
          why: "If neither an attended nor a missed event arrives within 24 hours, the flow alerts the team. It does not guess and send the wrong follow-up." },
        { day: "Day 12", title: "Requests a demo", what: "A direct hand-raise on the contact-sales form.", nodes: ["web", "segment", "cio", "sf"],
          event: `analytics.track("demo_requested", {\n  form: "contact-sales",\n  interest: "wind forecasts"\n})`,
          cio: [["act", "Goal reached. He exits Webinar nurture."]],
          sf: [["act", "Lead Status: MQL (a hand-raise skips scoring)"], ["", "Routed to the energy team · follow-up agreed within 2 working days"]],
          why: "A direct request goes to sales at once, whatever the score. Store the MQL date, so speed to first contact can be measured." },
        { day: "Day 20", title: "Opportunity opened", what: "Sales qualifies the request.", nodes: ["sf", "dd"],
          event: `// No tracking call. Salesforce stage change.`,
          cio: [["", "Synced: has_open_opportunity = true. Paused from nurture."]],
          sf: [["act", "Opportunity: €36,000 · Stage: Discovery"]],
          why: "Attribution uses the Salesforce stage dates. If those dates are missing or wrong, every attribution model is wrong too." },
      ],
      touches: [["Newsletter click", "first"], ["Webinar registration: Lead created", "lead"], ["Reminder email click", ""], ["Webinar attended", ""], ["Demo request: opportunity created", "opp"]],
    },

    mikko: {
      name: "Mikko", tag: "Hobby developer", path: "Stays free",
      steps: [
        { day: "Day 0", title: "Finds the docs from a Google search", what: "Organic search. No UTM tags, and none are needed.", nodes: ["web", "segment"],
          event: `analytics.page("Docs: getting started", {\n  path: "/docs/weather-api/getting-started"\n})\n// referrer: google.com (organic)`,
          cio: [["idle", "Anonymous visitor."]], sf: [["idle", "No record."]],
          why: "Never add UTM tags to internal links. They overwrite the real source (here, organic search)." },
        { day: "Day 0", title: "Signs up with a personal email", what: "Free Developer plan.", nodes: ["product", "segment", "cio"],
          event: `analytics.identify("u_90311", {\n  email: "mikko.dev@gmail.example",\n  plan: "developer"\n})\nanalytics.track("account_created", { plan: "developer" })`,
          cio: [["act", "Enters automation: Developer activation"]],
          mail: ["Your API key, and a first call in three lines", "Welcome · sent now"],
          sf: [["idle", "No record. Personal email and no company, so not a sales lead."]],
          why: "A rule for personal email domains keeps sales time for real buyers. Mikko still gets full onboarding." },
        { day: "Day 2", title: "No API call yet", what: "The automation waits for first_api_call, for up to 2 days.", nodes: ["cio"],
          event: `// No event. The wait step times out.`,
          cio: [["act", "Wait until first_api_call, or 2 days: timed out"]],
          mail: ["Your first weather call: copy, paste, run", "Quick start · one example, one link to the docs"],
          sf: [["idle", "No record."]],
          why: "One clear example works better than a feature list. Free users who never make a first call rarely return without a nudge." },
        { day: "Day 3", title: "Makes his first API call", what: "Activation done.", nodes: ["product", "segment", "cio"],
          event: `analytics.track("first_api_call", {\n  endpoint: "forecasts"\n})`,
          cio: [["act", "Goal reached. Exits Developer activation."]],
          sf: [["idle", "No record."]],
          why: "Measure the activation flow against a small holdout group that gets no emails. That shows what the emails really add." },
        { day: "Day 30", title: "Uses 3,000 of 15,000 accesses", what: "Steady, light use.", nodes: ["product", "cio"],
          event: `// Daily usage feed updates attributes:\naccesses_this_month: 3000\nusage_percent: 20`,
          cio: [["", "No automation. Product update emails only, and only with consent."]],
          sf: [["idle", "No record."]],
          why: "Most free users stay free, and that is fine. The free tier's job is activation and goodwill. Pushing these users to sales wastes everyone's time." },
      ],
    },
  };

  const MODELS = { first: "First touch", last: "Last touch", linear: "Linear", u: "U-shaped", w: "W-shaped" };
  const MODEL_NOTE = {
    first: "All credit to the touch that started the path to the deal.",
    last: "All credit to the last touch before the opportunity opened.",
    linear: "Equal credit to every touch.",
    u: "40% to the first touch, 40% to lead creation, 20% shared by the rest.",
    w: "30% each to first touch, lead creation and opportunity creation; 10% shared by the rest.",
  };

  function credit(touches, model) {
    const n = touches.length, out = new Array(n).fill(0);
    const idx = r => touches.findIndex(t => t[1] === r);
    const spread = (share, keys) => { const rest = touches.map((_, i) => i).filter(i => !keys.includes(i)); rest.forEach(i => out[i] += share / rest.length); };
    if (model === "first") out[0] = 1;
    else if (model === "last") out[n - 1] = 1;
    else if (model === "linear") out.fill(1 / n);
    else if (model === "u") { const k = [idx("first"), idx("lead")]; k.forEach(i => out[i] += 0.4); spread(0.2, k); }
    else { const k = [idx("first"), idx("lead"), idx("opp")]; k.forEach(i => out[i] += 0.3); spread(0.1, k); }
    return out;
  }

  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const eur = v => "€" + Math.round(v).toLocaleString("en-GB");
  const MAIL_ICO = '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><rect x="2.5" y="4.5" width="15" height="11" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="m3 5.5 7 5.5 7-5.5" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>';
  const PLAY = '<svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M2 1v10l9-5z" fill="currentColor"/></svg>';
  const PAUSE = '<svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M2 1h3v10H2zM7 1h3v10H7z" fill="currentColor"/></svg>';
  let who = "laura", i = 0, model = "w", broken = false, timer = null;

  $("people").innerHTML = Object.entries(PEOPLE).map(([k, p]) =>
    `<button type="button" role="radio" data-p="${k}" aria-checked="${k === who}"><b>${p.name}</b>${p.steps.some(x => x.breakable) ? '<i class="flag" title="Includes a sync error to try"></i>' : ""} <span>· ${p.path}</span></button>`).join("");
  $("models").innerHTML = Object.entries(MODELS).map(([k, l]) => `<button type="button" role="radio" data-m="${k}" aria-checked="${k === model}">${l}</button>`).join("");
  $("flow").innerHTML = NODES.map(([k, l]) => `<span class="node" data-n="${k}">${l}</span>`).join("");

  const lines = arr => arr.map(([b, t]) => `<p class="${b === "idle" ? "q" : ""}">${b === "act" ? '<span class="badge b-act">Now</span>' : ""}${esc(t)}</p>`).join("");

  function journey() {
    const p = PEOPLE[who];
    $("journey").innerHTML = p.steps.map((st, n) =>
      `<li class="${n < i ? "done" : n === i ? "cur" : ""}${st.breakable ? " brk" : ""}"><button type="button" data-i="${n}" ${n === i ? 'aria-current="step"' : ""}><span class="d">${st.day}</span><span class="dot"></span><span class="t">${esc(st.title)}</span>${st.breakable ? '<span class="brk-tag">Break it</span>' : ""}</button></li>`).join("");
    const cur = $("journey").children[i];
    if (cur && $("journey").scrollWidth > $("journey").clientWidth) {
      const j = $("journey");
      j.scrollTo({ left: cur.offsetLeft - j.clientWidth / 2 + cur.offsetWidth / 2, behavior: "smooth" });
    }
  }

  function render() {
    const p = PEOPLE[who], s = p.steps[i];
    journey();
    $("stepday").textContent = `${p.name}, ${p.tag.charAt(0).toLowerCase() + p.tag.slice(1)} · ${s.day}`;
    $("steptitle").textContent = s.title;
    $("stepwhat").textContent = s.what;
    document.querySelectorAll(".node").forEach(el => el.classList.toggle("on", s.nodes.includes(el.dataset.n)));
    const isBroken = !!(s.breakable && broken);
    $("p-event").textContent = isBroken ? s.eventBroken : s.event;
    $("p-cio").innerHTML = (isBroken ? lines([["act", "Registration received; confirmation sent."], ["", "Customer.io accepts free text. The failure shows up downstream."]]) : lines(s.cio))
      + (s.mail ? `<div class="mail">${MAIL_ICO}<div><b>${esc(s.mail[0])}</b><span>${esc(s.mail[1])}</span></div></div>` : "");
    $("p-sf").innerHTML = isBroken
      ? `<p><span class="badge b-err">Rejected</span>No Lead, no Campaign Member.</p><pre>${esc(s.sfBroken.err)}</pre>`
      : lines(s.sf);
    $("sf-tool").innerHTML = s.breakable ? `<label class="switch${broken ? "" : " hint"}"><input type="checkbox" id="brk" ${broken ? "checked" : ""}>Break the sync</label>` : "";
    $("sf-panel").classList.toggle("err", isBroken);
    $("p-why").innerHTML = `<b class="${isBroken ? "fix" : ""}">${isBroken ? "Fix" : "Watch for"}</b><span>${esc(isBroken ? s.sfBroken.fix : s.why)}</span>`;
    $("prev").disabled = i === 0; $("next").disabled = i === p.steps.length - 1;
    const brk = $("brk"); if (brk) brk.onchange = e => { stop(); broken = e.target.checked; render(); };
    renderAttr(i === p.steps.length - 1);
  }

  function renderAttr(show) {
    const p = PEOPLE[who], box = $("attr"), was = !box.hidden;
    box.hidden = !show;
    if (!show) return;
    if (!was) requestAnimationFrame(() => { const r = box.getBoundingClientRect(); if (r.bottom > innerHeight) scrollBy({ top: r.bottom - innerHeight + 24, behavior: "smooth" }); });
    if (!p.touches) {
      $("attr-title").textContent = "No deal, nothing to credit";
      $("attr-sub").textContent = "Mikko counts as an activated free user.";
      $("models").hidden = true; $("attr-bars").innerHTML = ""; $("attr-note").textContent = ""; return;
    }
    $("models").hidden = false;
    $("attr-title").textContent = `Who gets credit for ${eur(p.deal)}`;
    $("attr-sub").textContent = p.dealName;
    document.querySelectorAll("#models button").forEach(b => b.setAttribute("aria-checked", b.dataset.m === model));
    const c = credit(p.touches, model);
    $("attr-bars").innerHTML = p.touches.map((t, n) =>
      `<div class="bar-row"><span>${esc(t[0])}</span><div class="track"><div class="fill" style="width:${(c[n] * 100).toFixed(1)}%"></div></div><span class="val">${eur(c[n] * p.deal)}</span></div>`).join("");
    $("attr-note").textContent = MODEL_NOTE[model];
  }

  function go(n) { const len = PEOPLE[who].steps.length; i = Math.max(0, Math.min(len - 1, n)); render(); }
  function setPlay(on) {
    $("play").classList.toggle("on", on);
    $("play-ico").innerHTML = on ? PAUSE : PLAY;
    $("play-txt").textContent = on ? "Pause" : (i >= PEOPLE[who].steps.length - 1 ? "Replay" : "Play");
    $("play").setAttribute("aria-label", on ? "Pause" : "Play");
  }
  function stop() { if (timer) { clearInterval(timer); timer = null; } setPlay(false); }
  function play() {
    if (i >= PEOPLE[who].steps.length - 1) go(0);
    setPlay(true);
    timer = setInterval(() => { if (i >= PEOPLE[who].steps.length - 1) { stop(); return; } go(i + 1); setPlay(true); }, 8000);
  }

  $("play").onclick = () => { timer ? stop() : play(); };
  $("prev").onclick = () => { stop(); go(i - 1); };
  $("next").onclick = () => { stop(); go(i + 1); };
  $("journey").onclick = e => { const b = e.target.closest("button"); if (b) { stop(); go(+b.dataset.i); } };
  $("people").onclick = e => { const b = e.target.closest("button"); if (!b) return; stop(); who = b.dataset.p; broken = false;
    document.querySelectorAll("#people button").forEach(x => x.setAttribute("aria-checked", x === b)); go(0); setPlay(false); };
  $("models").onclick = e => { const b = e.target.closest("button"); if (b) { model = b.dataset.m; renderAttr(true); } };
  document.addEventListener("keydown", e => {
    if ($("view-replay").hidden || e.target.closest("input,textarea,select,[role=radio]")) return;
    if (e.key === "ArrowRight") { stop(); go(i + 1); } else if (e.key === "ArrowLeft") { stop(); go(i - 1); }
  });
  document.addEventListener("viewchange", e => { if (e.detail !== "replay") stop(); });

  render(); setPlay(false);
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduce && !$("view-replay").hidden) setTimeout(() => { if (!timer && i === 0 && !$("view-replay").hidden) play(); }, 1500);
})();
