# Exam Prep — Questions You Will Likely Be Asked

---

## Almost Certain to Be Asked

**1. Why Shared Schema multi-tenancy?**
One DB for all tenants — cheaper and simpler. The `tenantId` check in every query is the safety net.
Tradeoff: a bug could leak one tenant's data to another. Alternative is separate DB per tenant — more isolated but way more expensive and complex to manage.

**2. What's in the JWT and why?**
`{ userId, role, tenantId }` — the `tenantId` is the key one. It means you don't need a DB lookup on every request to know which tenant's data to filter. If someone tampers with the token, `jwt.verify()` throws and they get a 401.
> Code: `backend/src/services/authService.js` — `generateJWT()`

**3. What is the Strategy Pattern and why did you use it?**
`IForecastStrategy` is the interface, `TimeSeriesAI` is the concrete class. If you wanted to swap the AI model (e.g. use a different provider), you'd write a new class that implements `predictDemand()` — nothing else in the codebase changes.
> Code: `backend/src/services/forecast/IForecastStrategy.js` and `TimeSeriesAI.js`

**4. What happens if the AI service is down when an event is created?**
The `setImmediate` call is wrapped in `.catch()` — it logs the error and continues. The event is still created successfully with a 201. The forecast simply won't appear until someone manually triggers it via the refresh endpoint. Availability was chosen over consistency for the forecast.
> Code: `backend/src/controllers/eventController.js` — `createEvent()`

**5. The race condition on ticket purchase — what is it and how do you solve it?**
Two users both check capacity, both see 1 ticket left, both proceed — without protection both would get a ticket. The nested Prisma write (`order.create` with `tickets: { create: ... }` inside) is a single atomic transaction. PostgreSQL ACID guarantees only one commits if they race.
> Code: `backend/src/controllers/ticketController.js` — `purchaseTicket()`
> Test: `BB-17` integration test validates this

---

## Likely to Be Asked

**6. Why is EventArtistLink an explicit table instead of Prisma implicit M2M?**
Because you need to store extra data on the relationship (`isHeadliner`). Prisma's implicit M2M only stores the two foreign keys — you can't add extra fields to it.
> Code: `backend/prisma/schema.prisma` — `EventArtistLink` model

**7. Why can't buyers create accounts?**
MVP scope decision — the platform targets organizers, not buyers. Buyers are identified by email only, stored as `buyerEmail` on `Order`. Tickets are retrieved by email lookup. If buyer accounts are added later, you'd introduce a registration flow and migrate existing orders by their `buyerEmail`.
> Code: `backend/src/controllers/ticketController.js` — comment at line 23

**8. Why are Venue and Artist global (no tenantId)?**
Venues are physical spaces — it makes no sense for "Zouk Main Room" to belong to only one organizer. Any organizer should be able to host an event there. Artist's `popularityScore` is also used as a feature in the AI model — it's a shared reference resource, not tenant data.

**9. What does `prisma migrate deploy` do vs `db push`?**
`migrate deploy` applies migration SQL files in order and records them in `_prisma_migrations`. Safe for production — never destructive, never drops data. `db push` just syncs the schema directly without recording history — fine for prototyping, dangerous in production.

---

## Have a One-Liner Ready

**Why `crypto.randomUUID()` instead of `Math.random()` for QR codes?**
`Math.random()` has ~41 bits of entropy — predictable enough to forge a QR code. `crypto.randomUUID()` has 122 bits of cryptographic randomness — practically unguessable.

**Why does SalesSnapshot exist if nothing writes to it during normal use?**
It's the designed input for future model retraining on real data. V1 uses 160 synthetic training samples. The table is the hook for V2 — replacing the synthetic CSV with a query against `SalesSnapshot` is a one-line change.

**Why two separate ML models instead of one?**
They answer different questions. The classifier answers "will it sell out?" (binary, yes/no). The regressor answers "how many days until it does?" (continuous number). One model can't cleanly output both.

**Why `setImmediate` and not `setTimeout(fn, 0)`?**
`setImmediate` runs after I/O events in the current iteration of the event loop, which guarantees the HTTP response has been flushed first. Both would work here in practice, but `setImmediate` is semantically correct for "run this after the current operation completes."

**Why do integration tests use a real database instead of mocks?**
Mocks can pass even when the real query would fail — e.g. a bad migration, a missing column, a constraint violation. A real test DB catches these. Unit tests use mocks because they're testing logic in isolation, not DB behaviour.

---

## Key File Locations (point to these during the exam)

| Topic | File |
|---|---|
| JWT generation | `backend/src/services/authService.js` |
| Auth middleware | `backend/src/middleware/authMiddleware.js` |
| Admin middleware | `backend/src/middleware/adminMiddleware.js` |
| Tenant isolation guard | `backend/src/controllers/eventController.js` |
| Atomic ticket purchase | `backend/src/controllers/ticketController.js` |
| Async forecast (setImmediate) | `backend/src/controllers/eventController.js` |
| Strategy Pattern | `backend/src/services/forecast/IForecastStrategy.js` |
| AI model (Python) | `ai-service/main.py` |
| Database schema | `backend/prisma/schema.prisma` |
| Deploy script | `backend/scripts/migrate-deploy.js` |
| All services defined | `render.yaml` |
