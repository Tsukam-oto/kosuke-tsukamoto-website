V32 — Cloudflare D1 page-view counter migration

Changes:
- functions/api/pageview.js no longer calls the legacy Netlify Function.
- The counter now reads/writes Cloudflare D1 through the Pages binding named DB.
- POST /api/pageview increments the total and returns {"count": N}.
- GET /api/pageview returns the current total without incrementing it.

Required Cloudflare setup:
- D1 database: kosuke-site-counter
- Table: counters(counter_name TEXT PRIMARY KEY, value INTEGER NOT NULL DEFAULT 0)
- Existing row: counter_name='total' with the latest legacy total
- Pages binding variable name: DB

After deploying V32, Netlify is no longer required for the page-view counter.
Do not delete the old Netlify site until the V32 counter has been verified on production.
