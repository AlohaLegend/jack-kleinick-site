# Jack Kleinick Website

Interactive portfolio prototype for music producer Jack Kleinick.

## Run locally

This version has no build step. The easiest preview is to open `index.html` directly from File Explorer.

You can also serve the folder with the Windows launcher:

```powershell
.\start-site.cmd
```

Then visit `http://localhost:4173`.

If your browser cannot reach `localhost`, use:

```powershell
.\open-site.cmd
```

That starts the server and opens `http://127.0.0.1:4173` directly.

For another computer on the same network, keep `start-site.cmd` running and open:

```text
http://YOUR-LAN-IP:4173
```

Find the LAN IP with:

```powershell
ipconfig
```

## Notes

- The public site is static and loads editable work data from `content/works.js`.
- To edit works with the lightweight admin backend, run:

```powershell
.\start-admin.cmd
```

Then open:

```text
http://127.0.0.1:4184/admin/
```

On first launch the admin creates a local `.admin-password` file. That file is ignored by git. The editor can import a Spotify link, download cover art, generate the pastel background color, edit credits/tracks, delete old works, save `content/works.js`, and publish content changes to GitHub Pages if git push is authenticated on the computer.
- `assets/studio-hero.jpg` is a compressed placeholder image used for the playlist/selected-works card.
- The site is static and deploys through GitHub Pages from `main`.
- The Info page links to Jack's Instagram handle, Spotify playlist, Apple Music search, and YouTube Music search.
- Before final launch, re-check the credit metadata and replace placeholder/playlist artwork if Jack supplies approved assets.
