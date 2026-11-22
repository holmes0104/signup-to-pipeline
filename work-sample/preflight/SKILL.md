---
name: campaign-preflight
description: Check a Customer.io email campaign before it is sent - links and UTM tags, Liquid personalisation and fallbacks, consent and unsubscribe, sender domain, subject and preheader, HTML size and accessibility - and write a sign-off note for the campaign owner. Use when someone says "preflight", "QA this campaign", "check before send", "is this ready to go out", or shares a campaign folder or email HTML before launch.
---

# Campaign preflight

Goal: nothing reaches a customer that a two-minute check would have caught. The script does the mechanical checks; you do the judgement checks; the campaign owner signs off.

## 1. Run the checker

From the work-sample root:

```bash
python preflight/preflight.py campaigns/<campaign-folder> --links --out reports/<campaign-folder>.md
```

- `--links` requests every link. Leave it out when offline.
- For a new sending domain, also run `python preflight/preflight.py --domain <domain> --dkim-selector <selector>`.
- Exit code 1 means at least one FAIL.

## 2. Read the report

- **FAIL**: the campaign does not go out. Fix it at the source (the template, `campaign.json` or the tracking plan), rebuild and run again. Never edit the generated HTML by hand.
- **WARN**: decide, and write the decision down. Example: "Subject is 70 characters with a long webinar title; accepted, the key words come first."
- If a check fails because the tracking plan is wrong rather than the email, change the plan with the data owner. Do not loosen the checker.

## 3. Judgement checks the script cannot do

Read every message as the recipient would, then check:

1. **Audience**: does the segment match the intent? Who could receive this by mistake (customers, competitors, people in the wrong country)?
2. **Claims**: every number, date, price and product claim matches an approved source.
3. **Tone and length**: one main message, one main action per email.
4. **Timing**: send time in the recipient's time zone; no clash with other sends to the same people this week.
5. **Rendering**: seed-list send to Gmail, Outlook and Apple Mail, light and dark mode, desktop and phone.
6. **Edge cases**: test people for each branch (consented, not consented, missing first name, late registrant). Each one gets exactly the messages the flow specification says.

## 4. Sign-off note

Write a short note for the campaign owner:

```
Campaign: <name>                  Checked: <date>, by <name>
Preflight: <n> FAIL (must be 0), <n> WARN
WARN decisions: <one line each>
Judgement checks: audience / claims / tone / timing / rendering / edge cases: done or open
Ready to send: yes / no, because <reason>
```

The campaign owner gives the final yes. This skill never schedules or sends anything.

## Notes for the team

- The checker reads `tracking-plan.json`. If you add an event or attribute in Segment, add it to the plan first; otherwise every email using it will FAIL.
- UTM rule: `utm_source=customerio`, `utm_medium=email`, `utm_campaign=<campaign_id>`, `utm_content=<message_id>`, all lowercase. Unsubscribe and preference links never carry UTM tags.
- Marketing email needs a subscription topic, a consent filter and `{% unsubscribe_url %}`. Transactional email (a registration confirmation) does not, and must not carry promotional content.
