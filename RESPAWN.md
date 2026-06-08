# Jack Kleinick Website Respawn Point

This project lives at `D:\LOOMSWEBSITE`.

Use this file to continue the build from another computer or another Codex session.

## Project

- Client/site: Jack Kleinick, producer / multi-instrumentalist / songwriter.
- GitHub repo: `https://github.com/AlohaLegend/jack-kleinick-site`
- Live test site: `https://alohalegend.github.io/jack-kleinick-site/`
- Current style direction: dark, editorial, simple, music-credit portfolio, with floating draggable album covers and a record/player focus area.
- Main files: `index.html`, `styles.css`, `app.js`.
- Managed work data: `content/works.js`.
- Admin backend/UI: `admin-server.mjs`, `admin/index.html`, `admin/styles.css`, `admin/admin.js`.
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

From PowerShell:

```powershell
cd D:\LOOMSWEBSITE
.\start-admin.cmd
```

Then open:

```text
http://127.0.0.1:4184/admin/
```

The admin backend creates a local `.admin-password` file on first run unless `JACK_ADMIN_PASSWORD` is set. `.admin-password` is ignored by git.

Admin flow:

- Paste a Spotify link to import metadata and cover art.
- The browser samples the Spotify thumbnail and fills dark/pastel colors.
- Edit credits and tracks manually.
- Save writes `content/works.js`.
- Publish runs fixed git commands to commit content changes and push `HEAD:main`.

## Verify

Check JavaScript syntax:

```powershell
& "$env:LOCALAPPDATA\OpenAI\Codex\bin\node.exe" --check app.js
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
git add index.html styles.css app.js content/works.js admin-server.mjs admin start-admin.cmd start-admin.ps1 README.md RESPAWN.md
git commit -m "Describe the change"
git push origin HEAD:main
```

GitHub Pages can take a short moment to update after push.

## Current Notes

- Info page uses `assets/jack-kleinick-portrait.jpeg`.
- Info page contact includes Instagram handle `@jackkleinick`.
- The homepage has a soft physics field around the dragged cover so nearby works repel before hard collision.
- Keep the design close in spirit to the inspiration site: minimal, typographic, music-forward. Keep enough difference through the floating album-cover interaction, record player focus area, and darker album-reactive palette.
- The live GitHub Pages site remains static; the admin backend is for editing/publishing and should not be replaced with a client-side password on GitHub Pages.
