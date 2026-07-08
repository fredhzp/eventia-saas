# Eventia — End-to-End Tests (Playwright)

Full-stack browser tests that drive the **real** frontend against the **real**
backend and a **real** Postgres database. They cover the flows that lose money
or leak data when broken.

## How it works

- `global-setup.js` runs once before anything else. It creates a dedicated
  `eventia_e2e` database, applies migrations, seeds demo data, adds one
  guaranteed sold-out event (`seedE2E.js`), and writes an expired JWT for the
  auth test. Nothing touches your dev (`eventia_db`) or jest (`eventia_test`) DBs.
- Playwright then boots two servers on **dedicated ports** so they never clash
  with a running dev stack:
  - backend (Express + Prisma) → `http://localhost:4100`, pointed at `eventia_e2e`
  - frontend (Vite, `--mode e2e` → `.env.e2e`) → `http://localhost:5175`
- Tests run **serially** (`workers: 1`) for deterministic, reproducible runs.

## Prerequisites

- Postgres reachable at `postgresql://admin:password123@localhost:5432` with
  permission to `CREATE DATABASE` (same credentials the app already uses).
- Browsers installed once: `npx playwright install chromium webkit`
  (WebKit powers the iPhone 14 test — the engine real iPhones use).

## Run

```bash
cd frontend
npm run test:e2e            # headless, all specs
npm run test:e2e -- --ui    # interactive UI mode
npm run test:e2e:report     # open the last HTML report
```

The AI microservice is **not** required — forecast calls fail fast and are
ignored during seeding and event creation.

## What's covered (14 tests)

| Spec | Scenario | Why it matters |
|---|---|---|
| `auth` | signup → logout → login → dashboard | account access must work |
| `auth` | wrong password → error, no redirect | fails closed |
| `auth` | invalid token → redirect to login, no data flash | no protected-data leak |
| `events` | create event → appears in list | core organizer action |
| `events` | publish draft → persists after reload | edited state is saved, not local |
| `purchase` | buy ticket → confirmation + QR | the revenue path |
| `purchase` | sold-out → UI disabled **and** API rejects (no ticket) | no overselling |
| `checkin` | valid QR → accepted | door works |
| `checkin` | same QR twice → rejected | single-use / anti-fraud |
| `tenant-isolation` | org A dashboard hides org B events | multi-tenant isolation (UI) |
| `tenant-isolation` | org A cannot mutate org B event → 403 | multi-tenant isolation (API) |
| `tenant-isolation` | expired token → 401 on protected endpoint | stale creds rejected |
| `session-refresh` | purchase then see it in My Tickets, same session | end-to-end journey |
| `mobile` | purchase on iPhone 14 viewport (WebKit) | mobile buyers |

## Notes

- The app has no free-text event edit; **status** is the editable field, so
  "edit persists" is exercised via publish → reload.
- The app has no realtime push, so "reflects a new purchase without a manual
  refresh" is the SPA journey (client-side nav + fetch, never a browser reload).
- Multi-tenant isolation is enforced by the backend on **mutations**
  (PATCH/DELETE return 403). There is no per-event detail URL, so the
  "direct access" case is proven at the API layer plus the dashboard UI.
