# Windows server and Cloudflare Tunnel

Guests use `https://beer.pccampbell.org`. Docker runs the app and a restricted public gateway; Cloudflare's `cloudflared` connector runs as a Windows service on the same server. The gateway preserves live results and only exposes the guest app's APIs. PocketBase administration stays at `http://localhost:8090/_/` on the server.

## 1. Prepare the domain

Add `pccampbell.org` to Cloudflare on the Free plan. In Squarespace's domain settings, change its nameservers to the two Cloudflare assigns. Registration and renewals remain with Squarespace. Wait until Cloudflare marks the domain active. Preserve any DNS records you want to keep.

## 2. Start the app on the server

Install Git and Docker Desktop using Linux containers/WSL 2. Use a current Docker Compose version (2.24.4 or later is required for the port override). Clone the repository in PowerShell:

```powershell
git clone https://github.com/pccampbell/octoberfest-tasting-app.git
cd octoberfest-tasting-app
Copy-Item deploy/cloudflare.env.example .env
docker compose -f compose.yaml -f compose.cloudflare.yaml up -d --build --wait --wait-timeout 120
docker compose -f compose.yaml -f compose.cloudflare.yaml logs tasting
```

Copy the example only when creating the server's `.env`; preserve an existing configuration. Do not copy the laptop's `.env` or development administrator credentials.

Open the first-superuser installer link in the logs using `http://localhost:8090` as the address. Complete setup on the server, then use `http://localhost:8090/_/` to add beers and manage the event. A new server volume starts empty; Git does not copy the laptop's database. To retain existing beers/ratings, follow the backup/restore procedure in the README instead of reseeding.

In PocketBase Settings, configure the trusted proxy/User IP proxy headers to **only `X-Real-IP`**. The gateway overwrites that header with Cloudflare's visitor IP so guests do not all share one rate-limit bucket. Keep rate limiting enabled. Direct administration and the gateway are bound to localhost by this Compose configuration, regardless of `HOST_BIND`.

Check `http://localhost:8095/join` on the server. The guest app should open, while `http://localhost:8095/_/` and `http://localhost:8095/api/settings` should return 404.

## 3. Connect Cloudflare

In Cloudflare, go to **Networking → Tunnels**, create a tunnel named `oktoberfest`, and select the Windows connector. Follow its download instructions and run the supplied `cloudflared.exe service install ...` command in PowerShell **as Administrator**. Keep its tunnel token private; it does not belong in Git or the app's `.env`.

Add a published application route:

| Setting      | Value            |
| ------------ | ---------------- |
| Subdomain    | `beer`           |
| Domain       | `pccampbell.org` |
| Path         | Leave blank      |
| Service type | `HTTP`           |
| Service URL  | `localhost:8095` |

**Route the tunnel to 8095, not 8090.** Port 8090 bypasses the public gateway's admin restrictions. Cloudflare supplies public HTTPS; the local service uses HTTP. No router port forwarding is needed. Leave Cloudflare caching at its defaults; do not add a Cache Everything rule for this app or remove its visitor IP header. Guests should be able to open the site without a Cloudflare Access login.

## 4. Verify before sharing

- Turn Wi-Fi off on a phone and open `https://beer.pccampbell.org/join`.
- Join, rate a beer, refresh, and confirm the saved score and notes. Check that `/results` updates live from another browser.
- Open `/qr` and scan the QR; its destination must use `https://beer.pccampbell.org`.
- Confirm `https://beer.pccampbell.org/_/` and `/api/settings` return 404. Local administration at `http://localhost:8090/_/` must still work.
- Create and download a PocketBase backup before the event.

Use the public HTTPS address consistently from the beginning of the event. A guest who joined using the laptop's LAN address has a separate browser identity there; changing to the public address does not automatically move that session.

Keep Windows awake and connected. Enable Docker Desktop startup at sign-in and confirm the containers start after a server restart; Docker Desktop may require a signed-in Windows session. The Cloudflare connector is a Windows service, but it cannot serve the app while Docker is stopped.

## Updates

After backing up the event, run these on the server:

```powershell
git pull --ff-only
docker compose -f compose.yaml -f compose.cloudflare.yaml up -d --build --wait --wait-timeout 120
```

Use both Compose files for all server operations. Do not run plain `docker compose up` there: that omits the gateway override. Never use `down -v` for an event you want to preserve.

Official references: [Cloudflare Tunnel setup](https://developers.cloudflare.com/tunnel/get-started/), [Squarespace nameservers](https://support.squarespace.com/hc/en-us/articles/4404183898125-Review-change-or-reset-your-domain-s-nameservers), [PocketBase proxy settings](https://pocketbase.io/docs/going-to-production/).
