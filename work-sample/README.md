# Webinar nurture and campaign preflight: a marketing automation work sample

A small, working example of how I build and check an email programme: the flow logic is documented first, the emails are built from reusable blocks, and a Claude skill checks every campaign before it is sent.

The webinar, people and sending domain are fictional. Links point to public xweather.com pages as stand-ins. Built on 18 November 2026 with Claude Code, at my direction, for the Vaisala Xweather Marketing Automation and Technology Specialist application. It has not been run in a live Customer.io workspace.

## What is here

| Path | What it shows |
|---|---|
| `flow-spec.md` | Flow diagram, messages, edge cases, Salesforce Campaign Member updates, testing plan and measures |
| `tracking-plan.json` | Events, person attributes and the UTM convention. The single source the checker enforces |
| `templates/blocks.py` | Modular, responsive email blocks: table layout, inline styles, bulletproof button, dark mode, hidden preheader. Colours and shapes follow xweather.com's public site; the wordmark is text, not the real logo, and the footer marks every email as an unofficial sample |
| `templates/build_emails.py` | Builds the four emails from the blocks |
| `campaigns/webinar-nurture/` | The campaign config and the four built emails |
| `campaigns/broken-example/` | A campaign with deliberately planted errors |
| `preflight/preflight.py` | The pre-send checker (Python, standard library only) |
| `preflight/SKILL.md` | The Claude skill: run the checker, make the judgement checks, write the sign-off note. Doubles as a training note for the team |
| `reports/` | Checker output for both campaigns and a domain check |
| `send_test_events.py` | Sends four test people and their events to a Customer.io trial workspace (needs your own keys; `--dry-run` prints the requests) |
| `previews/` | Desktop and 375 px phone renders |

## What the checker catches

On the planted-error campaign: 19 FAIL, 11 WARN with `--links` (`reports/broken-example.md`). Among them:

- a sending domain that is not authenticated, no consent filter, no subscription topic, no unsubscribe link
- `{{customer.firstname}}` (the attribute does not exist) and `{{customer.first_name}}` with no fallback
- a link to an owned page with no UTM tags, UTM values that break the naming rule, a URL with a space, an `http://` link, an empty link and a page that returns 404
- an image without alt text, no viewport tag, spam-trigger words in the subject

On the real campaign: 0 FAIL, 2 WARN (`reports/webinar-nurture.md`). The two warnings are real decisions for a person: two subjects run past 60 characters once the long webinar title is filled in.

The domain check reads SPF, DMARC and a DKIM selector over DNS-over-HTTPS. It treats DMARC `p=none` as a warning and follows a subdomain to the organisational domain's record.

## How to run

```bash
python templates/build_emails.py
python preflight/preflight.py campaigns/webinar-nurture --links
python preflight/preflight.py campaigns/broken-example --links
python preflight/preflight.py --domain praised.co --dkim-selector resend
python send_test_events.py --dry-run --outcomes
```

## How this maps to the role

| The role asks for | Here |
|---|---|
| Nurture flows from brief to send, with segmentation, personalisation and QA | `flow-spec.md`, the four emails, the preflight |
| Documented logic, edge cases and testing before launch | Edge-case table and testing plan in `flow-spec.md`; four test people in `send_test_events.py` |
| Events and triggers | `tracking-plan.json`, trigger events in the campaign |
| Consent, suppression and database safeguards | Consent filter, subscription topic and unsubscribe checks |
| Structured A/B tests | Subject A/B test with a stated metric and minimum sample |
| Deliverability: SPF, DKIM, DMARC | `--domain` check |
| Responsive templates and modular blocks | `templates/blocks.py` |
| Claude skills and training notes for the team | `preflight/SKILL.md` |
| UTM governance | UTM convention in the tracking plan, enforced on every owned link |

## Limits

- Not built or sent in Customer.io. The next step is a trial workspace: build the flow, send the test events, run the seed-list test.
- The Liquid check covers `{{ }}` variables and a list of known tags, not full Liquid syntax.
- The organisational-domain lookup takes the last two labels. That works for names like `example.com` or `example.co`, not for `example.co.uk`.
