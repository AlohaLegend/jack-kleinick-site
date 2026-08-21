# Jack Kleinick Website Respawn Point

The current checkout lives in the `jack-kleinick-site` repository. Do not rely on an old machine-specific drive path.

Use this file to continue the build from another computer or another Codex session.

## Project

- Client/site: Jack Kleinick, producer / multi-instrumentalist / songwriter.
- GitHub repo: `https://github.com/AlohaLegend/jack-kleinick-site`
- Production site: `https://jackkleinick.com/`
- Current style direction: dark, editorial, simple, music-credit portfolio, with floating draggable album covers and a record/player focus area.
- Main files: `index.html`, `styles.css`, `app.js`.
- Managed fallback data: `content/works.json` and `content/works.js`.
- Live content/auth backend: Cloudflare Worker in `cms-auth-worker/`.
- Live Worker URL: `https://jack-kleinick-cms-auth.bammediaauth.workers.dev`.
- Live admin UI: `admin/index.html`, `admin/styles.css`, `admin/admin.js`, served at `https://jackkleinick.com/admin/`.
- Cross-platform local server: `node server.mjs`.
- Windows launcher: `start-site.cmd`, backed by `server.ps1`.

## Run Locally

From the repository root on macOS, Linux, or Windows:

```sh
node server.mjs
```

On Windows, you can alternatively use:

```powershell
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

The password is stored in Cloudflare as `ADMIN_PASSWORD`. If a local copy is needed, keep it in `.jack-admin-password.txt`; that file is ignored by git.

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

```sh
cd cms-auth-worker
npm install
npm run deploy
```

## Verify

Check JavaScript syntax:

```sh
node --check app.js
node --check admin/admin.js
node --check previews/slot-columns/app.js
node --check cms-auth-worker/src/index.js
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

```sh
git status --short
git add -- <confirmed paths>
git commit -m "Describe the change"
git push -u origin HEAD
```

Merge the reviewed branch into `main`; GitHub Pages deploys automatically after the merge.

## Current Notes

- Info page uses `assets/jack-kleinick-portrait.jpeg`.
- Info page contact includes Instagram handle `@jackkleinick`.
- Admin UI keeps a small wagon lane using `admin/assets/station-wagon.svg`, a public-domain OpenClipart/FreeSVG station wagon asset.
- The homepage has a soft physics field around the dragged cover so nearby works repel before hard collision.
- Keep the design close in spirit to the inspiration site: minimal, typographic, music-forward. Keep enough difference through the floating album-cover interaction, record player focus area, and darker album-reactive palette.
- The live GitHub Pages site remains static. Do not put passwords or write logic into the static site; use the Cloudflare Worker.
