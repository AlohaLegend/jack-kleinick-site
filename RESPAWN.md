# Jack Kleinick Website Respawn Point

This project lives at `D:\LOOMSWEBSITE`.

Use this file to continue the build from another computer or another Codex session.

## Project

- Client/site: Jack Kleinick, producer / multi-instrumentalist / songwriter.
- GitHub repo: `https://github.com/AlohaLegend/jack-kleinick-site`
- Live test site: `https://alohalegend.github.io/jack-kleinick-site/`
- Current style direction: dark, editorial, simple, music-credit portfolio, with floating draggable album covers and a record/player focus area.
- Main files: `index.html`, `styles.css`, `app.js`.
- Managed fallback data: `content/works.json` and `content/works.js`.
- Live content/auth backend: Cloudflare Worker in `cms-auth-worker/`.
- Live Worker URL: `https://jack-kleinick-cms-auth.bammediaauth.workers.dev`.
- Live admin UI: `admin/index.html`, `admin/styles.css`, `admin/admin.js`, served at `https://jackkleinick.com/admin/`.
- Local server script: `start-site.cmd`, backed by `server.ps1`.

## Run Locally

From PowerShell:

```powershell
cd D:\LOOMSWEBSITE
.\start-site.cmd
```

Then open:

```text
http://127.0.0.1:4173/
```

For another computer on the same network, use this computer's LAN IP with port `4173`.

## Admin Editor

Open:

```text
https://jackkleinick.com/admin/
```

The password is stored in Cloudflare as `ADMIN_PASSWORD`. A local copy exists at `D:\LOOMSWEBSITE\.jack-admin-password.txt` and is ignored by git.

Admin flow:

- Paste a Spotify link to import metadata and cover art.
- The Worker saves cover art to KV and the browser samples the Spotify thumbnail for dark/pastel colors.
- Edit credits and tracks manually.
- Save writes the live catalog to Cloudflare KV.
- New public page loads fetch `https://jack-kleinick-cms-auth.bammediaauth.workers.dev/content/works.json`.
- The admin dashboard also shows lightweight Worker-backed analytics for the last 30 days.

## Worker

Cloudflare resources:

- Worker: `jack-kleinick-cms-auth`
- KV binding: `JACK_CMS_CONTENT`
- KV namespace id: `bf87c400024e4ea9bda2e99db925b483`
- Secrets: `ADMIN_PASSWORD`, `SESSION_SECRET`
- Analytics keys:
  - `analytics:day:YYYY-MM-DD` stores aggregate daily totals.
  - `analytics:visitor-day:YYYY-MM-DD:*` deduplicates same-day visitors.
  - `analytics:visitor-all:*` estimates first-time visitors.
- Analytics endpoints:
  - `POST /analytics/collect` receives public production pageview beacons.
  - `GET /api/analytics?days=30` returns authenticated dashboard data.

Deploy Worker changes:

```powershell
D:\JAKESWEBSITE\cms-auth-worker\node_modules\.bin\wrangler.cmd deploy --config D:\LOOMSWEBSITE\cms-auth-worker\wrangler.toml
```

## Verify

Check JavaScript syntax:

```powershell
& "C:\Users\LMO80\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" --check app.js
```

Useful responsive checks:

- Desktop: `1440 x 900`
- Laptop: `1280 x 800`
- iPad/tablet: `820 x 1180`
- iPhone: `390 x 844`

Things to re-check after motion changes:

- Floating tracks should move slowly and smoothly.
- Dragging a selected track should gently push other tracks away before contact.
- Mobile tracks should not visually bounce off the record/player container.
- Info page should feel bespoke and not like a generic bio card.
- Details modal should stay readable on mobile.

## Publish

When changes are ready:

```powershell
git status --short
git add index.html styles.css app.js content admin cms-auth-worker robots.txt README.md RESPAWN.md
git commit -m "Describe the change"
git push origin HEAD:main
```

GitHub Pages can take a short moment to update after push.

## Current Notes

- Info page uses `assets/jack-kleinick-portrait.jpeg`.
- Info page contact includes Instagram handle `@jackkleinick`.
- Admin UI uses `admin/assets/station-wagon.svg`, a public-domain OpenClipart/FreeSVG station wagon asset.
- The homepage has a soft physics field around the dragged cover so nearby works repel before hard collision.
- Keep the design close in spirit to the inspiration site: minimal, typographic, music-forward. Keep enough difference through the floating album-cover interaction, record player focus area, and darker album-reactive palette.
- The live GitHub Pages site remains static. Do not put passwords or write logic into the static site; use the Cloudflare Worker.
