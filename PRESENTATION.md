# Eventia SaaS — Final Exam Presentation Skeleton

---

## Slide 1 — Title

**Eventia: A Multi-Tenant Event Management SaaS Platform**

> A full-stack PERN-stack cloud-deployed platform where event organizers manage events, track ticket sales, and get AI-powered demand forecasts.

---

## Slide 2 — Problem & Solution

**Problem:** Event organizers have no easy way to predict whether their event will sell out or when to push marketing harder.

**Solution:** Eventia is a SaaS platform built on the **Shared Schema** multi-tenancy pattern — a single deployed application and database serve multiple independent organizations, each fully isolated by `tenantId`.

**Four actor types:**
| Actor | What they do |
|---|---|
| **Platform Admin** | Manages all tenants, venues, and events platform-wide |
| **Organizer** | Manages their own events, views forecasts, controls status |
| **Buyer (Attendee)** | Browses public events, purchases tickets by email — **no account needed** |
| **Check-in Staff** | Scans QR codes at the door via `/checkin` — no login required |

---

## Slide 3 — Architecture & Tech Stack

```
┌─────────────────────────────────────────────────────────────────┐
│                        Render Cloud (oregon)                     │
│                                                                  │
│  ┌──────────────┐     ┌──────────────┐     ┌─────────────────┐  │
│  │   Frontend   │────▶│   Backend    │────▶│  AI Forecasting │  │
│  │  React/Vite  │     │ Node/Express │     │   Microservice  │  │
│  │   (static)   │◀────│  REST API    │     │  FastAPI/Python │  │
│  └──────────────┘     └──────┬───────┘     └─────────────────┘  │
│                              │                                    │
│                       ┌──────▼───────┐                           │
│                       │  PostgreSQL  │                           │
│                       │   (Prisma)   │                           │
│                       └──────────────┘                           │
└─────────────────────────────────────────────────────────────────┘
```

**PERN Stack** — 3 web services + 1 managed database, all defined in a single `render.yaml`

| Layer | Technology |
|---|---|
| Frontend | React + Vite + Tailwind + Recharts |
| Backend | Node.js + Express 5 + Prisma ORM |
| AI Service | Python + FastAPI + scikit-learn |
| Database | PostgreSQL |
| Auth | JWT + bcryptjs |
| CI/CD | GitHub Actions + Render IaC |

⚠️ **Demo note:** Free-tier services sleep after 15 min — first load may take 25–35 seconds.

---

## Slide 4 — Database Schema

```
Tenant ──────────────────────────────────────────────────┐
  │ id, name, apiKey, subscriptionStatus                  │
  │                                                       │
  ├── User (role: ADMIN | ORGANIZER)  ← tenanted          │
  │                                                       │
  └── Event ─────────────────────────────────────────────┘
        │ id, title, startTime, status (DRAFT|PUBLISHED|CANCELLED)
        │
        ├──▶ Venue  ← GLOBAL (no tenantId — shared across all organizers)
        │
        ├──▶ EventArtistLink ──▶ Artist  ← GLOBAL
        │      isHeadliner (bool) [composite PK: eventId + artistId]
        │
        ├──▶ Ticket ──▶ Order
        │      qrCode (crypto.randomUUID — 122-bit entropy)
        │      checkedInAt       buyerEmail (VARCHAR — no User FK)
        │
        ├──▶ SalesSnapshot (totalSold, velocityPerHour)
        │      ← stores real velocity data for future model retraining
        │
        └──▶ DemandForecast (confidenceScore, predictedSelloutDate)
               [1-to-1 via application upsert, not a DB constraint]
```

**Key decisions:**
- `Venue` + `Artist` are **global** — any organizer can use any venue
- Buyers stored as `buyerEmail` on `Order` — **no User row created for buyers**
- Explicit join table `EventArtistLink` to store `isHeadliner` boolean
- QR codes upgraded from `Math.random()` (~41 bits) → `crypto.randomUUID()` (122 bits)

---

## Slide 5 — Multi-Tenancy & RBAC

**Pattern: Shared Schema** — one DB, tenants separated by `tenantId` in every query

```js
// authService.js — JWT encodes tenantId at login
jwt.sign({ userId: user.id, role: user.role, tenantId: user.tenantId }, JWT_SECRET, { expiresIn: '1d' });
```

```js
// eventController.js — tenantId from JWT guards every mutation
const { tenantId } = req.user;
if (event.tenantId !== tenantId) return res.status(403).json({ error: 'Forbidden' });

// Business rule enforced server-side: must cancel before deleting
if (event.status === 'PUBLISHED') return res.status(400).json({ error: 'PUBLISHED_EVENT' });
```

**Middleware chain:**
```
Request → authMiddleware (verify JWT) → adminMiddleware (role === ADMIN) → handler
```

- Self-registration always creates an **Organizer** — no role dropdown
- Admin routes are double-gated: valid JWT **and** `role === ADMIN`

---

## Slide 6 — AI Forecasting Microservice

**Two scikit-learn Gradient Boosting pipelines** (`StandardScaler` → model):

```
Features: venue_capacity, tickets_sold, days_until_event, artist_popularity,
          fill_rate (= tickets_sold / venue_capacity)

  Pipeline 1: StandardScaler → GradientBoostingClassifier
    → confidence_score  (probability of selling out)

  Pipeline 2: StandardScaler → GradientBoostingRegressor
    → predicted_days_to_sell_out

  Trained on: 160 synthetic domain-realistic samples | Model: v2.0-sklearn-gbm
```

**Strategy Pattern** keeps the AI provider interchangeable:
```js
class IForecastStrategy {          // abstract interface
  async predictDemand(data) { throw new Error('must be implemented'); }
}
class TimeSeriesAI extends IForecastStrategy { ... }  // HTTP call to Python
```

**"Selling Fast" badge** shown on public storefront when `confidence_score >= 0.50`

⚠️ **MVP caveat:** Trained on synthetic data. `SalesSnapshot` table is designed to accumulate real velocity data for a future retraining pipeline.

---

## Slide 7 — Backend Design: Three Layers + Key Patterns

**Three-Layer Architecture** (refactored from a monolithic `index.js`):
```
Route → Middleware → Controller (Presentation)
                          ↓
                     Service (Business Logic)
                          ↓
                    Repository (Data Access) → Prisma → PostgreSQL
```

**Async forecast on event creation** — organizer never waits for the AI:
```js
res.status(201).json({ event: newEvent });   // respond immediately

setImmediate(() => runForecastForEvent(newEvent.id));  // AI runs after
```

**Atomic ticket purchase** — prevents race condition (two buyers passing capacity check simultaneously):
```js
await prisma.order.create({
  data: {
    ...orderData,
    tickets: { create: ticketData }   // nested write — single atomic transaction
  }
});
```
PostgreSQL ACID guarantees prevent double-selling. Validated by `BB-17` integration test.

---

## Slide 8 — Testing Strategy

**54 tests total — all passing.**

| Layer | Tool | What's tested |
|---|---|---|
| Node unit (white-box) | Jest | `authService`, `eventService` — **mocked** dependencies |
| Node integration (black-box) | Jest + Supertest | `auth`, `events`, `admin`, `tickets`, `checkin` — **real test DB** |
| Python unit | pytest | `test_model.py` — AI pipeline output validation |
| Python integration | pytest + httpx | `test_api.py` — FastAPI endpoint contracts |

**CI:** GitHub Actions runs `test-backend` and `test-ai` **in parallel** on every push.

**Load test (Apache Bench):** 50 concurrent clients, 1000 requests → **54.3 req/s, 920ms mean, 0 failed requests**

---

## Slide 9 — Deployment (Infrastructure as Code)

Everything in one `render.yaml` — 3 web services + managed PostgreSQL:

```yaml
databases:
  - name: eventia_db_frpe        # PostgreSQL — internal URL wired automatically

services:
  - name: eventia-backend
    buildCommand: npm ci && npx prisma generate && node scripts/migrate-deploy.js
    envVars:
      - key: DATABASE_URL
        fromDatabase: { name: eventia_db_frpe, property: connectionString }

  - name: eventia-ai
    runtime: python
    startCommand: uvicorn main:app --host 0.0.0.0 --port $PORT

  - name: eventia-frontend
    buildCommand: npm ci && npm run build   # VITE_API_URL baked in at build time
```

**Smart deploy script** (`scripts/migrate-deploy.js`):
- Detects fresh vs. existing database
- Clears stuck failed migrations (P3009)
- Runs `prisma migrate deploy` — applies only new migrations, never destructive

**Local dev:** `docker compose up --build` runs all four services.

---

## Slide 10 — Live Demo

**Demo flow:**
1. **`/`** — public listings, "Selling Fast" badges (no login)
2. **Login as organizer** → `organizer@zouk.com` / `Password1!`
3. **`/dashboard`** — tenant-scoped events, ticket counts, bar chart, AI confidence scores
4. **Run forecast** — confidence + predicted sellout date update live
5. **Create event** — starts as `DRAFT` → publish it
6. **Login as admin** → `admin@admin.com` / `admin`
7. **`/admin`** — all tenants, cross-tenant events, venue management
8. **`/checkin`** — QR scan / manual check-in (no login needed)

**Concepts to call out:**
| Concept | Where to point |
|---|---|
| Shared Schema multi-tenancy | Organizer only sees their own events |
| RBAC | Admin sees everything; organizer gets 403 on other tenants |
| Async AI | Event creates instantly, forecast appears moments later |
| Business rule enforcement | Try to delete a PUBLISHED event — blocked server-side |
| Buyerless purchase | Ticket bought with just an email — no account created |
| Strategy Pattern | `IForecastStrategy → TimeSeriesAI` in code |
