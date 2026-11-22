# From sign-up to pipeline

A working prototype of lifecycle marketing automation for a weather API business. Made by Thanh Nguyen (Holmes) for an application to the Marketing Automation and Technology Specialist role at Vaisala Xweather, November 2026.

Live page: https://xweather.holmesnguyen.info

**Fictional people, companies, IDs and amounts. Not connected to, or endorsed by, Vaisala or Xweather.** The free tier and subscription figures come from xweather.com's public pricing page, checked 21 November 2026.

## What is here

| Path | What it is |
|---|---|
| `index.html`, `replay.js`, `styles.css` | Lifecycle replay: three people moving through Segment, Customer.io, Salesforce and attribution, one step at a time |
| `preflight.js` | Browser version of the pre-send checker (same checks as the Python version, without live link requests) |
| `data.js`, `build-data.js` | The sample campaigns and tracking plan, packed for the page (`node build-data.js`) |
| `work-sample/` | Flow specification, tracking plan, modular email templates, the Python checker, the Claude skill, and test-event script. See `work-sample/README.md` |

## Run locally

Open `index.html` in a browser, or serve the folder with any static server. No build step and no dependencies.

Built with Claude Code, at my direction.
