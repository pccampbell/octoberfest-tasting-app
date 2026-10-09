# Verification · October 9, 2026

Executed on Windows with Node 22.20, PocketBase 0.40.5, and Playwright Chromium. Browser tests use the compiled production frontend served directly by PocketBase, with the real migrations and access rules.

| Check                                        | Result                         |
| -------------------------------------------- | ------------------------------ |
| Production build and strict TypeScript check | Passed                         |
| ESLint                                       | Passed                         |
| Unit and persistence tests                   | 10 passed                      |
| Playwright browser/API tests                 | 11 passed                      |
| PocketBase setup command                     | Passed; pinned binary detected |
| Official Docker base image tags              | Both pinned tags exist         |

Verified behavior includes independent guests with identical names, trimmed/limited names, pending registration recovery, duplicate-submit protection, browser closure and token restoration, rating ownership, score/note validation, database uniqueness, editing/deletion, preserved drafts after a lost save response, exact aggregates, distinct participant counts, sanitized views, polling failure/recovery, empty and inactive lineups, production SPA/API/admin routes, and the configured QR destination.

Real PocketBase ratings survived a server restart and repeated migration application. A built-in backup ZIP was extracted into a fresh directory and served by an isolated instance; original rating IDs, ownership, notes, scores, and aggregates matched. A generated disposable administrator secret was absent from the compiled frontend.

Mobile screenshots were inspected at 320px; horizontal overflow checks passed. Desktop join, QR, and results screenshots were reviewed. The TV dashboard was tested at 1920×1080. Local fonts and artwork require no third-party image service.

## Before the party

- Docker was not installed in this environment. Container startup, health check execution, recreation, and rebuilding with the persistent volume still require verification on the target Docker host.
- No physical phone, camera scanner, TV, or separate LAN device was available. Confirm the final public URL, Wi-Fi/firewall access, QR scanning on iOS/Android, and fullscreen display on your actual equipment.
- Add the actual beer lineup through PocketBase, verify a few saved ratings, and create/download a backup before guests arrive.
- Same-device storage is the recovery mechanism. Cleared storage or a changed browser/device/origin requires the documented host-assisted procedure; unsaved drafts are not queued offline.
