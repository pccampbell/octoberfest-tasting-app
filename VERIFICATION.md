# Verification · October 9, 2026

Executed on Windows with Node 22.20, PocketBase 0.40.5, and Playwright Chromium. Browser tests use the compiled production frontend served directly by PocketBase, with the real migrations and access rules.

| Check                                        | Result                          |
| -------------------------------------------- | ------------------------------- |
| Production build and strict TypeScript check | Passed                          |
| ESLint                                       | Passed                          |
| Unit and persistence tests                   | 14 passed                       |
| Playwright browser/API tests                 | 15 passed                       |
| PocketBase setup command                     | Passed; pinned binary detected  |
| Official Docker base image tags              | Both pinned tags exist          |
| Docker image build and Compose startup       | Passed on local Docker Desktop  |
| Container health check and runtime user      | Healthy; UID/GID 10001          |
| Docker app routes and QR destination         | Passed using laptop LAN address |

Verified behavior includes independent guests with identical names, trimmed/limited names, pending registration recovery, duplicate-submit protection, browser closure and token restoration, rating ownership, score/note validation, database uniqueness, editing/deletion, preserved drafts after a lost save response, exact aggregates, distinct participant counts, sanitized views, polling failure/recovery, empty and inactive lineups, production SPA/API/admin routes, and the configured QR destination.

Deleted guest sessions are detected on navigation and when returning focus to Join. Two separate Peter sessions were tested: deleting one did not affect the other's ratings, and explicitly starting fresh created an independent guest. Network failures retained the saved identity and offered retry. Browser tests disable rate limiting only on their isolated test server so unrelated scenarios sharing one IP do not exhaust each other's request budget; production limits remain enabled.

Real PocketBase ratings survived a server restart and repeated migration application. A built-in backup ZIP was extracted into a fresh directory and served by an isolated instance; original rating IDs, ownership, notes, scores, and aggregates matched. A generated disposable administrator secret was absent from the compiled frontend.

The origin migration was applied to a database created with the original schema and existing ratings. Country/state fields defaulted to blank without changing ratings, and origin metadata survived backup restoration. Browser/API checks covered country/state validation and display, US/Germany defaults, state comparisons, equal-weight averages with unequal rating counts, exclusion of unrated/inactive/unassigned beers, live score updates, retained filters across hide/reveal, and stacked mobile comparisons without overflow.

The retro artwork and print styling were inspected on join, tasting, QR, and results pages. Responsive checks passed at 320, 390, 430, 768, and 1280px without horizontal overflow. Standard unrated mobile beer rows measured 106–109px tall, and Rate/Edit targets remained at least 44px. Uploaded beer images, long names, full descriptions in the rating dialog, saved notes, and personal rankings were checked using disposable PocketBase data. The TV dashboard was tested at 1920×1080. Local fonts and artwork require no third-party service at runtime; the generated illustration is an optimized transparent WebP.

Mobile rows reserve space for an inline score beside Edit so ratings do not change their height. Disposable-browser checks at 320, 390, and 430px verified identical before/after heights with a score of 10 and long notes, Edit to the left of the score, 44px tap targets, grey rated backgrounds, and restoration of the original height/background after clearing. Cards with notes expand using a card tap, without a visible label; an accessible keyboard control remains available. Checks at 320, 375, 390, 430, and 680px confirmed matching unrated/rated heights with long notes and collapse back to the original height. Focused checks also verified full multiline text, keyboard expansion, independent Edit behavior, and removal of the control when notes are cleared. Desktop keeps the notes preview.

After WSL installation, `docker compose up -d --build --wait --wait-timeout 90` successfully built and started the Linux amd64 image. HTTP checks against the laptop's LAN address returned 200 for health, join, QR, results, and admin routes. A browser check confirmed the QR rendered with the configured LAN destination and that the destination opened the guest join form. The container remains running for manual phone testing.

The current app passed a full Docker image rebuild from the repository Dockerfile and is healthy. Before deploying the origin migration, the stopped data volume was archived to `.test-data/live-backups/before-origins-20261009-224843.tar.gz`. Compose recreated the container with the same volume, and public counts remained at nine beers, two rated participants, and three ratings. Read-only checks verified country/state fields and the origin panels against the running LAN app. Existing origins were left blank for the host to fill in.

## Before the party

The optional Windows/Cloudflare deployment was tested in a separate `cloudflare-readiness` Docker project with its own database. The Compose override bound both app administration and the public gateway only to localhost, even when the test environment specified `HOST_BIND=0.0.0.0`. Both containers became healthy, and Nginx configuration validation passed. Browser checks through the gateway covered guest registration, saved ratings after reload, expanded notes, results updates, and the QR configured for `https://beer.pccampbell.org`. Uploaded images were accessible. Fifteen management/unknown routes, including encoded admin paths and superuser endpoints, returned 404 even with a valid disposable admin token; local administration remained available. PocketBase logs confirmed that the gateway supplied the Cloudflare visitor IP instead of a caller-supplied `X-Real-IP`. Domain activation, the actual Windows tunnel service, external HTTPS, and cellular access still require verification on the home server.

- Repeat the full image build, container recreation, and saved-rating checks on the target Docker host. Local image build, startup, health, and aggregate counts survived recreation.
- No physical phone, camera scanner, TV, or separate LAN device was available. Confirm the final public URL, Wi-Fi/firewall access, QR scanning on iOS/Android, and fullscreen display on your actual equipment.
- Add the actual beer lineup through PocketBase, verify a few saved ratings, and create/download a backup before guests arrive.
- Same-device storage is the recovery mechanism. Cleared storage or a changed browser/device/origin requires the documented host-assisted procedure; unsaved drafts are not queued offline.
