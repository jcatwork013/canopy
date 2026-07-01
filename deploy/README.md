# Canopy — Production deployment (host 62.146.239.31)

This host is a **shared server**: a system **nginx** terminates TLS and reverse-
proxies several apps, each bound to a `127.0.0.1` port. Canopy follows the same
pattern — it does **not** bind `:80/:443`, so the other sites are untouched.

```
Cloudflare (proxied, universal *.9bricks.com edge cert)
        │  HTTPS
        ▼
system nginx (:443)  ──vhost──▶ canopy.9bricks.com        → 127.0.0.1:13300 (web)
                     ──vhost──▶ admin-canopy.9bricks.com  → 127.0.0.1:13300 (web)
                     ──vhost──▶ api-canopy.9bricks.com    → 127.0.0.1:18100 (api)
                                                              │
                                          docker: web · api · postgres · minio
```

## What's deployed & live

| Domain | → | Container | Status |
|---|---|---|---|
| `canopy.9bricks.com` | web | `canopy-prod-web-1` (Caddy static, SPA) | ✅ 200 |
| `admin-canopy.9bricks.com` | web (same SPA, admin routes) | `canopy-prod-web-1` | ✅ 200 |
| `api-canopy.9bricks.com` | api | `canopy-prod-api-1` (Go) | ✅ health ok |

Internal: `canopy-prod-postgres-1`, `canopy-prod-minio-1` (no host ports).
Containers are `restart: unless-stopped` (survive reboot).

## Files

- `docker-compose.prod.yml` — the stack (web/api bound to `127.0.0.1:13300/18100`).
- `.env.production` — secrets (mode 600, gitignored). Template: `.env.production.example`.
- `deploy/nginx/*.conf` — the three vhosts (installed to `/etc/nginx/sites-available`,
  symlinked into `sites-enabled`).
- `/etc/ssl/canopy/{fullchain,privkey}.pem` — origin cert (see TLS below).

## Redeploy / update

```bash
cd /root/Canopy
git pull   # if applicable
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

nginx vhost changes:
```bash
cp deploy/nginx/canopy.9bricks.com.conf /etc/nginx/sites-available/
ln -sf /etc/nginx/sites-available/canopy.9bricks.com.conf /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx      # ALWAYS test before reload
```

## First-run configuration (readiness gate)

1. The API seeded the **system admin** from `.env.production` on first boot
   (`BOOTSTRAP_ADMIN_EMAIL` / `BOOTSTRAP_ADMIN_PASSWORD`).
2. Open **https://admin-canopy.9bricks.com** → "Đăng nhập quản trị" → sign in.
3. **Setup Wizard**: enter **Gemini API key** + **Resend API key**, hit **Test**,
   **Save**. Storage (MinIO) is already green.
4. When all four checks pass, `status.ready=true` and the gate opens.

Secrets are stored **AES-256-GCM encrypted** in Postgres — never in env/plaintext.

## TLS notes

- Public TLS to browsers is **Cloudflare's universal cert** for `*.9bricks.com`
  (valid, auto-renewed by Cloudflare).
- Cloudflare→origin uses our **self-signed cert** at `/etc/ssl/canopy/`. This works
  because the zone's SSL mode is **Full** (accepts any origin cert).
- **Recommended hardening**: replace the self-signed origin cert with a
  **Cloudflare Origin Certificate** (15-year) or a real Let's Encrypt cert via
  **DNS-01** (`certbot --dns-cloudflare`, needs a CF API token). HTTP-01 won't
  work while the records are proxied (Cloudflare forces HTTPS). After issuing,
  point `ssl_certificate*` in the three vhosts at the new paths and reload.

## TODO before heavy use

- **MinIO public (Phase 3)**: presigned upload/download URLs must be browser-
  reachable. Add a `storage-canopy.9bricks.com` vhost → MinIO and set
  `MINIO_PUBLIC_URL` before uploads go live. Today MinIO is internal-only.
- **Backups**: snapshot the `pgdata` + `miniodata` docker volumes.
- **Resend domain**: verify the sending domain in Resend before email verification
  (Phase 2) works for real users.

> `deploy/Caddyfile` is an **alternative** edge config for a greenfield host
> without an existing nginx — not used on 62.146.239.31.
