# Domain setup

Recommended domain: `jackkleinick.com`

Hosting: GitHub Pages, free, from this repo.

Registrar recommendation: Porkbun or Cloudflare Registrar. Porkbun is usually the easiest checkout flow for a non-technical owner. Cloudflare is also inexpensive, but the dashboard is more technical.

After buying the domain, set these DNS records:

```text
Type   Name   Value
A      @      185.199.108.153
A      @      185.199.109.153
A      @      185.199.110.153
A      @      185.199.111.153
CNAME  www    AlohaLegend.github.io
```

Optional IPv6 records:

```text
Type   Name   Value
AAAA   @      2606:50c0:8000::153
AAAA   @      2606:50c0:8001::153
AAAA   @      2606:50c0:8002::153
AAAA   @      2606:50c0:8003::153
```

Once DNS has propagated, enable HTTPS in GitHub:

1. Go to `https://github.com/AlohaLegend/jack-kleinick-site/settings/pages`.
2. Confirm the custom domain is `jackkleinick.com`.
3. Turn on `Enforce HTTPS` when GitHub allows it.

DNS can take up to 24 hours to fully settle.
