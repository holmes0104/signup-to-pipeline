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

## Email photos

Both are CC0 (no credit required; credited anyway), hosted in `email/` at 1200 × 500 and shown at 600 px:

- `email/wind-farm.jpg`: "Kentish Flats Offshore Wind Farm" by Back ache, CC0, via Wikimedia Commons (https://commons.wikimedia.org/w/index.php?curid=152241516)
- `email/storm.jpg`: "Stormy weather", CC0, via rawpixel (https://www.rawpixel.com/image/3298982/free-photo-image-storm-cc0-creative-commons)
