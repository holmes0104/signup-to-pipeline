// Packs the work-sample campaigns, emails and tracking plan into data.js so the page runs without a server.
const fs = require("fs"), path = require("path");
const ws = path.join(__dirname, "work-sample");
const read = p => fs.readFileSync(path.join(ws, p), "utf8");
const camp = name => {
  const cfg = JSON.parse(read(`campaigns/${name}/campaign.json`));
  const emails = {};
  for (const m of cfg.messages) emails[m.file] = read(`campaigns/${name}/${m.file}`);
  return { cfg, emails };
};
const data = {
  plan: JSON.parse(read("tracking-plan.json")),
  campaigns: { "broken-example": camp("broken-example"), "webinar-nurture": camp("webinar-nurture") },
};
fs.writeFileSync(path.join(__dirname, "data.js"), "window.DEMO_DATA = " + JSON.stringify(data) + ";\n");
console.log("data.js written", (fs.statSync(path.join(__dirname, "data.js")).size / 1024).toFixed(1), "KB");
