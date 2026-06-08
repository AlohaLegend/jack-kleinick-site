# Jack Kleinick Admin Worker

This Cloudflare Worker powers the password-protected admin at:

```text
https://jackkleinick.com/admin/
```

It stores the live selected works catalog in Cloudflare KV. The public site reads:

```text
https://jack-kleinick-cms-auth.bammediaauth.workers.dev/content/works.json
```

The checked-in `content/works.json` and `content/works.js` files are fallbacks if the Worker is unavailable.

## Secrets

Set these as encrypted Worker secrets:

- `ADMIN_PASSWORD`: the password used to open `/admin/`
- `SESSION_SECRET`: a long random string for signing 12-hour sessions

The current local admin password copy is stored in `.jack-admin-password.txt`, which is ignored by git.

## Deploy

From the repo root:

```powershell
D:\JAKESWEBSITE\cms-auth-worker\node_modules\.bin\wrangler.cmd deploy --config D:\LOOMSWEBSITE\cms-auth-worker\wrangler.toml
```

## Notes

- Imported Spotify cover art is stored in the same KV namespace under `/assets/uploads/`.
- The admin tab stores the signed session token in `sessionStorage`; the Worker also sets an HttpOnly cookie.
- Static GitHub Pages never contains the password.
