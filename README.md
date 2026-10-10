# Oktoberfest · The Tasting Table

A self-hosted beer tasting app with name-only guest entry, private scores and notes, personal rankings, a QR welcome screen, and a TV leaderboard. React/TypeScript/Vite/Tailwind, shadcn-style Radix components, Lucide, and the official PocketBase SDK. PocketBase **0.40.5** serves the production frontend and SQLite database in one container; dependencies and binary checksums are pinned.

Retro print artwork, paper textures, and typography use local assets. Phones get a compact beer list with Rate/Edit actions; tap cards with saved notes to expand or collapse the full text. Desktop keeps the card grid. Beer descriptions and complete tasting notes remain available in the rating dialog. See [ARTWORK.md](ARTWORK.md) for the illustration's generation prompt and optimized asset.

## Start with Docker

For a Docker test on your laptop, use these `.env` settings:

```dotenv
PUBLIC_APP_URL=http://localhost:8090
HOST_BIND=127.0.0.1
APP_PORT=8090
```

Start Docker Desktop, then run `docker compose up -d --build` and open `http://localhost:8090`. To test only the image build without starting the app, run `docker compose build`. The app runs on the computer executing Docker; your home server is not involved. The QR page intentionally does not generate a localhost QR code.

To test the QR code with a phone, change `PUBLIC_APP_URL` to your laptop's Wi-Fi IP (for example `http://10.0.0.16:8090`) and `HOST_BIND` to `0.0.0.0`. Apply the settings with `docker compose up -d`, open `/qr` on the laptop, and scan it with a phone on the same Wi-Fi. First check that the phone can open that address manually. If it cannot, check Windows Firewall access on the private network and Wi-Fi client isolation. Your laptop must stay on and connected during testing; its IP may change when you switch networks.

When deploying for guests:

1. Copy `.env.example` to `.env` if it does not exist. Set `PUBLIC_APP_URL` to the computer hosting the app's reachable LAN address (for example `http://192.168.1.50:8090`) or HTTPS hostname, and set `HOST_BIND=0.0.0.0`. Use your laptop's address for phone testing now, and your home server's address when deploying there. The example address is not automatically detected.
2. Run:

   ```sh
   docker compose up -d --build
   docker compose logs tasting
   ```

3. Open the first-superuser installer link from the logs on the host. Substitute the server address for `127.0.0.1` when necessary. Finish setup, then open `/_/` to manage the event.
4. In the `beers` collection, add the actual lineup and enable `is_active`. Set `sort_order` for the pouring order. Choose `country` (`US` or `Germany`) and optionally enter a US `state` such as `Wisconsin`; leave state blank for German beers. Images, style, ABV, and descriptions are optional. There are **no production seed beers**.
5. Display `/qr` while guests arrive and `/results` on the TV. Guests use `/join` and `/taste`.

The image supports Linux amd64 and arm64. It runs as UID/GID `10001`, with PocketBase as its sole server process. The named `tasting_data` volume holds database files, uploaded images, and local backups. A health check calls `/api/health`; Compose waits up to 30 seconds for shutdown. Existing bind mounts must be writable by UID `10001`.

To deploy an update, take a backup, then repeat `docker compose up -d --build`. Migrations run transactionally once and do not seed or reset records. **Do not remove the data volume or run `docker compose down -v`.** Keep the old image tag and backup when upgrading PocketBase; schema compatibility must be checked before downgrading.

For internet access on the Windows home server, follow [the Cloudflare deployment guide](deploy/CLOUDFLARE.md). It adds a restricted public gateway while keeping administration on localhost. Local guest identities need a stable origin: switching hostname, port, HTTP/HTTPS, browser, or device creates a different browser storage area.

## Develop locally

Use Node 22.20+ (or another version compatible with pinned Vite) and npm. `unzip` is needed on macOS/Linux; Windows uses PowerShell.

```sh
npm ci
npm run setup:pb
```

Copy `.env.example` to `.env` and configure `PUBLIC_APP_URL`. Run these in separate terminals:

```sh
npm run dev:pb
```

```sh
npm run dev
```

Open `http://localhost:5173`. Vite proxies `/api` to PocketBase on port 8090. For guests testing the Vite interface on the LAN, use `http://YOUR_LAN_IP:5173` for `PUBLIC_APP_URL` and open the firewall to the private network. The production URL normally uses port 8090. PocketBase's admin interface is `http://localhost:8090/_/`.

To test static production hosting without Docker, run `npm run build` and `npm run dev:pb`, then open port 8090. PocketBase provides the SPA fallback; the hook reserves unknown API routes for JSON errors rather than returning React HTML. Admin routes remain PocketBase's own interface.

### Development sample beers

`sample-data/beers.json` contains six clearly labeled fictional samples. They are never applied automatically. After creating a local superuser, set these **local-only** `.env` values:

```dotenv
ALLOW_DEV_SEED=yes
PB_ADMIN_EMAIL=your-local-superuser-email
PB_ADMIN_PASSWORD=your-local-superuser-password
```

Run `npm run seed:dev`. It adds missing samples without changing existing beers or ratings. Clear the admin variables afterward. Do not prefix credentials with `VITE_`; only browser-safe configuration belongs there.

## Reliability and privacy

The results page keeps the overall leaderboard and adds two origin comparisons, initially US and Germany. Each panel's country selector and optional US state filter can compare countries or individual states. The prominent origin score averages the averages of **rated beers**, giving each beer equal weight regardless of its rating count; unrated beers are excluded. Existing beer origins remain blank after upgrading until the host fills them in. These beers stay on the overall board but do not enter an origin comparison. Re-running the development seed adds missing samples; it does not overwrite origins on samples already in the database.

- Each guest has a random internal `.invalid` email and 256-bit secret, generated using `crypto.getRandomValues` (also available on LAN HTTP). The display name is not the identity; identical names stay independent.
- Credentials are written to local storage **before** registration. Interrupted joins retry the same identity. Startup, navigation, and returning to the Join tab recheck the saved session; failures never silently register a replacement guest.
- Credentials in browser storage grant access to that guest's scores. Use personal browsers. Generated identities have email workflows disabled and never require verification.
- Ratings have a database-enforced unique `(guest, beer)` index, integer scores 1–10, and notes up to 300 characters. Guest access rules protect raw ratings and prevent changing their guest/beer relations. Only superusers manage beers and guest administration.
- Saves confirm only after server acknowledgement. Failed saves retain the draft while the dialog remains open; retries reconcile an existing record. There is no offline queue. Reloading with unsaved changes discards that unsaved draft, but preserves all acknowledged ratings.
- Progress uses stored ratings. Dashboard views contain sanitized aggregates only. Active beers determine the lineup, progress, rankings, and party statistics; deactivated beers retain their private records but leave the active event display. Rated beer deletion is blocked—deactivate instead.
- Dashboard requests poll every five seconds after the preceding request settles. Failures retain the last snapshot, show its timestamp, and retry automatically. Ties sort by average, count, name, then stable ID. The hide/reveal control affects that screen only; it is a presentation aid, not an access restriction.

## Backup and restore

Use PocketBase's **Settings → Backups**. Create a snapshot, wait until it completes, and download the ZIP to another device. Back up before the party, after the party, and before updates. Local backup files within the same volume do not protect against disk loss. Backups contain private data and authentication secrets; store them privately.

The supported snapshot includes SQLite data and locally uploaded images. Avoid copying a live `data.db` by itself: its WAL and other database files may contain pending transactions.

### Verify a downloaded backup without affecting the event

1. Install the pinned local PocketBase binary with `npm run setup:pb`.
2. Extract the downloaded ZIP into a **new empty** directory such as `restore-check/pb_data`; `data.db` must be directly inside it.
3. Launch an isolated instance using a different port:

   ```sh
   # Windows: replace ./.tools/pocketbase with .\.tools\pocketbase.exe
   ./.tools/pocketbase serve --http=127.0.0.1:8093 --dir=restore-check/pb_data --publicDir=dist --migrationsDir=pb_migrations --hooksDir=pb_hooks --automigrate=0
   ```

4. Sign into `http://127.0.0.1:8093/_/` with the backed-up host credentials. Compare rating IDs, scores, notes, guests, and aggregate counts with the snapshot's expected values. Open `/results` to inspect the restored leaderboard.
5. Stop this verification instance when done. The live server and its volume are untouched.

### Restore the event

Take a current backup first. In PocketBase **Settings → Backups**, upload the verified snapshot if needed and use its restore action. Restore replaces the event data with the snapshot and restarts the service; later ratings will be lost. Refresh the dashboard and check counts and a few known ratings. Retain the pre-restore backup until verification is complete.

If the server cannot run, stop it before working with the data volume. Extract the snapshot into a **new** data directory/volume and point a replacement instance at it; preserve the previous volume for rollback. A full copy of `pb_data` while PocketBase is stopped is also a safe backup. Never merge a restore into a running database.

The automated persistence test creates a real PocketBase backup, restarts the server, reapplies migrations, extracts the ZIP into an isolated directory, and verifies restored IDs, notes, scores, and aggregates.

## Troubleshooting and host-assisted recovery

| Symptom                              | Action                                                                                                                                                                                               |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Phone cannot open the QR destination | Check `PUBLIC_APP_URL`, shared Wi-Fi, private-network firewall access, and guest Wi-Fi client isolation. Open the displayed URL manually on the phone. A localhost URL intentionally produces no QR. |
| QR uses an old address               | Update `.env` and restart/recreate the service. Runtime config avoids a frontend rebuild. Keep the guest-facing origin stable during the event.                                                      |
| No beers appear                      | Enable `is_active` on the intended beer records. Refresh the lineup.                                                                                                                                 |
| Save fails                           | Keep the rating dialog open, restore connectivity, and retry. A previously successful write is reconciled without duplication.                                                                       |
| Results show a connection pause      | Last successful data remains visible; polling resumes automatically. Check the server health and logs.                                                                                               |
| Repeated rate-limit message          | Wait a minute. Check proxy IP configuration and the rate limits in Settings → Application.                                                                                                           |
| Startup fails                        | Inspect `docker compose logs tasting`; check volume permissions, port conflicts, and migration errors. Preserve data before making changes.                                                          |
| Browser storage is blocked/damaged   | Enable site storage in a regular browser. Ask the host before changing or clearing existing identity storage.                                                                                        |

**A name alone cannot recover a lost identity.** If storage was cleared or a guest changes devices, their old records remain in PocketBase but cannot securely be reclaimed through the join screen. Do not imply recovery just because names match.

For guests sharing a name, open **Device guest details** below **Continue as [name]** on each device. Match its guest reference to the record ID in PocketBase before making administrative changes. Deleting a guest does not clear that browser's saved credentials. When the app can no longer authenticate that identity, Join explains the failure and offers **Start a new guest session**, with confirmation. This clears only that browser's identity and lets it register again; it does not recover old ratings or affect another device's same-name guest. Temporary network errors offer retry rather than an identity reset.

For host-assisted recovery: back up first; have the guest join on the new device; identify that new record using its creation time and actual browser session. Privately confirm the old record with the guest using known scores/notes and the host's knowledge of the participant. If ambiguous, preserve the old records and do not assign them based solely on a name. In the admin interface, move each old rating's `guest` relation to the confirmed new guest. Resolve any existing new-device ratings deliberately before moving: the unique index rejects conflicts. Verify the guest's browser shows the expected notes and scores after a refresh, then remove the obsolete guest only after all records have been checked. Administrative reassignment is intentionally unavailable to guests.

## Checks

```sh
npm run setup:pb
npx playwright install chromium
npm run build
npm run lint
npm run format:check
npm test
npm run test:e2e
```

Tests use fresh ignored `.test-data` directories and loopback-only PocketBase instances on ports 8091/8092; production data is never used. `test:e2e` builds the frontend and exercises production PocketBase static serving. See [VERIFICATION.md](VERIFICATION.md) for executed checks and remaining deployment checks.

Useful source: [PocketBase authentication](https://pocketbase.io/docs/authentication/), [API access rules](https://pocketbase.io/docs/api-rules-and-filters/), and [production/backup guidance](https://pocketbase.io/docs/going-to-production/).
