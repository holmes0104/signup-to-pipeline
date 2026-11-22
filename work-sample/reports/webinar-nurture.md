# Preflight report: Webinar nurture: wind forecasts for operators (sample)

**0 FAIL · 2 WARN · 29 PASS**

| Result | Where | Check |
|---|---|---|
| WARN | confirm subject | Subject is 70 characters with example data; may be cut on mobile |
| WARN | reminder-24h subject A | Subject is 61 characters with example data; may be cut on mobile |
| PASS | sender | From domain `mail.example.com` is an authenticated sending domain |
| PASS | campaign | Trigger event `webinar_registered` is in the tracking plan |
| PASS | campaign | Marketing messages require marketing consent |
| PASS | confirm | Preheader present and matches the config |
| PASS | confirm | HTML size 4.4 KB |
| PASS | confirm | Transactional: no unsubscribe needed; content limited to the registration |
| PASS | reminder-24h subject B | Subject length 37 characters: "Anna, your seat for tomorrow is saved" |
| PASS | reminder-24h | A/B test defined: click-to-join rate, at least 400 per variant |
| PASS | reminder-24h | Preheader present and matches the config |
| PASS | reminder-24h | HTML size 4.9 KB |
| PASS | reminder-24h | Link "API documentation" follows the UTM convention |
| PASS | reminder-24h | www.xweather.com/docs returns HTTP 200 |
| PASS | reminder-24h | Unsubscribe link present |
| PASS | followup-attended subject | Subject length 35 characters: "Slides, recording and the next step" |
| PASS | followup-attended | Preheader present and matches the config |
| PASS | followup-attended | HTML size 5.3 KB |
| PASS | followup-attended | Link "Watch the recording" follows the UTM convention |
| PASS | followup-attended | Link "try the weather API" follows the UTM convention |
| PASS | followup-attended | Link "talk to our team" follows the UTM convention |
| PASS | followup-attended | www.xweather.com/ returns HTTP 200 |
| PASS | followup-attended | www.xweather.com/contact returns HTTP 200 |
| PASS | followup-attended | www.xweather.com/weather-api returns HTTP 200 |
| PASS | followup-attended | Unsubscribe link present |
| PASS | followup-missed subject | Subject length 39 characters: "Missed the session? Watch the recording" |
| PASS | followup-missed | Preheader present and matches the config |
| PASS | followup-missed | HTML size 4.5 KB |
| PASS | followup-missed | Link "Watch the recording" follows the UTM convention |
| PASS | followup-missed | www.xweather.com/ returns HTTP 200 |
| PASS | followup-missed | Unsubscribe link present |

Not checked by this script, needs a person: tone and claims, whether the segment matches the intent,
send time, rendering in real inboxes (seed list), and sign-off from the campaign owner.
