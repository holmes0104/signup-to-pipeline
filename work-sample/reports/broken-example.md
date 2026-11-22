# Preflight report: Broken example: what the checker catches (seeded errors)

**19 FAIL · 11 WARN · 3 PASS**

| Result | Where | Check |
|---|---|---|
| FAIL | sender | From domain `newsletter-tool.example.net` is not in the authenticated sending domains |
| FAIL | campaign | Marketing messages without a subscription topic |
| FAIL | campaign | Marketing messages are not filtered on `consent_marketing_email` |
| FAIL | campaign | Campaign ID (used as utm_campaign) is not a lowercase slug; UTM reports will split |
| FAIL | promo subject | `{{customer.firstname}}`: attribute `firstname` is not in the tracking plan |
| FAIL | promo | No viewport meta tag; mobile layout will not scale |
| FAIL | promo | Image without alt text: http://cdn.example.com/hero.png |
| FAIL | promo | Image loaded over HTTP: http://cdn.example.com/hero.png |
| FAIL | promo | `{{customer.first_name}}` has no `default` fallback; empty for people without `first_name` |
| FAIL | promo | `{{event.webinar_name}}`: `webinar_name` is not a property of trigger event `webinar_registered` |
| FAIL | promo | Link "Click here" to an owned page is missing utm_source, utm_medium, utm_campaign |
| FAIL | promo | Link "Read the docs" is not HTTPS: http://www.example.com/docs?utm_source=Newsletter&utm_medium=email&utm_campaign=q4 |
| FAIL | promo | Link "Read the docs": utm_source=Newsletter (expected customerio); utm_source=Newsletter breaks the naming rule |
| FAIL | promo | Link "Book a demo" has an empty href |
| FAIL | promo | Link "Old offer page" contains a space; encode it or fix the UTM value |
| FAIL | promo | http://www.example.com/docs?utm_source=Newsletter&utm_medium=email&utm_campaign=q4 returns HTTP 404 |
| FAIL | promo | https://www.example.com/weather-api returns HTTP 404 |
| FAIL | promo | https://www.example.com/webinars?utm_source=customerio&utm_medium=email&utm_campaign=q4-promo returns HTTP 404 |
| FAIL | promo | No `{% unsubscribe_url %}` link; required for marketing email (and Gmail/Yahoo bulk-sender rules) |
| WARN | sender | No reply-to address; replies go to the sending address |
| WARN | promo subject | Subject is 70 characters with example data; may be cut on mobile |
| WARN | promo subject | Subject wording to review (pushy phrases): act now |
| WARN | promo subject | Subject uses several exclamation marks or ALL-CAPS words |
| WARN | promo | Preheader is 2 characters; aim for about 40-110 |
| WARN | promo | Preheader in campaign.json does not match the hidden preheader in the HTML |
| WARN | promo | `<html>` has no lang attribute (screen readers) |
| WARN | promo | No color-scheme meta; dark-mode clients may invert colours unpredictably |
| WARN | promo | Image without width attribute (Outlook may show it full size): http://cdn.example.com/hero.png |
| WARN | promo | Link text "Click here" says nothing about the destination |
| WARN | promo | No preference-centre link; people can only unsubscribe from everything |
| PASS | campaign | Trigger event `webinar_registered` is in the tracking plan |
| PASS | promo | HTML size 1.9 KB |
| PASS | promo | Link "Past webinars" follows the UTM convention |

Not checked by this script, needs a person: tone and claims, whether the segment matches the intent,
send time, rendering in real inboxes (seed list), and sign-off from the campaign owner.
