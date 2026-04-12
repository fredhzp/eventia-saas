/**
 * BLACK-BOX integration tests — Tickets API
 * Techniques: equivalence partitioning, boundary value (sold-out at exact capacity),
 *             edge case (idempotent user creation via connectOrCreate).
 */

const { agent, prisma, clearTestDb, register, bearer, decode } = require('../helpers');

const PW = 'Test1234!';

let tenantId, eventId, soldOutEventId;

beforeAll(async () => {
  await clearTestDb();

  // Venue with capacity 50 for normal tests
  const venue = await prisma.venue.create({
    data: { name: 'Ticket Test Venue', capacity: 50 },
  });

  // Venue with capacity 1 for sold-out test
  const tinyVenue = await prisma.venue.create({
    data: { name: 'Tiny Venue', capacity: 1 },
  });

  // Register organiser
  const r = await register('tickets-org@test.com', PW, 'ORGANIZER');
  const token = r.body.token;
  tenantId = decode(token).tenantId;

  // Create and publish a normal event
  const evtRes = await agent
    .post('/api/events')
    .set({ Authorization: `Bearer ${token}` })
    .send({ title: 'Ticket Test Event', date: '2027-09-01T18:00:00Z', venueId: venue.id, tenantId });
  eventId = evtRes.body.event.id;

  await agent
    .patch(`/api/events/${eventId}/status`)
    .set({ Authorization: `Bearer ${token}` })
    .send({ status: 'PUBLISHED' });

  // Create a tiny-venue event and fill it to capacity
  const tinyEvt = await agent
    .post('/api/events')
    .set({ Authorization: `Bearer ${token}` })
    .send({ title: 'Tiny Event', date: '2027-09-02T18:00:00Z', venueId: tinyVenue.id, tenantId });
  soldOutEventId = tinyEvt.body.event.id;

  // Buy the only ticket → now sold out
  await agent.post('/api/tickets/purchase').send({
    eventId: soldOutEventId,
    customerEmail: 'filler@test.com',
    tenantId,
  });
});

afterAll(() => clearTestDb());

// ── BB-15 ─────────────────────────────────────────────────────────────────────

describe('BB-15 | POST /api/tickets/purchase — valid purchase', () => {
  it('returns 201 with a ticket containing a QR code', async () => {
    const res = await agent.post('/api/tickets/purchase').send({
      eventId,
      customerEmail: 'buyer@test.com',
      tenantId,
    });

    expect(res.status).toBe(201);
    expect(res.body.ticket).toBeDefined();
    expect(res.body.ticket.qrCode).toMatch(/^QR-/);
  });
});

// ── BB-16 ─────────────────────────────────────────────────────────────────────

describe('BB-16 | POST /api/tickets/purchase — non-existent eventId', () => {
  it('returns 404 when event does not exist', async () => {
    const res = await agent.post('/api/tickets/purchase').send({
      eventId:       'non-existent-id',
      customerEmail: 'nobody@test.com',
      tenantId,
    });

    expect(res.status).toBe(404);
  });
});

// ── BB-17 ─────────────────────────────────────────────────────────────────────

describe('BB-17 | POST /api/tickets/purchase — sold-out event (boundary: capacity = 1)', () => {
  it('returns 400 with error SOLD_OUT when at exact capacity', async () => {
    const res = await agent.post('/api/tickets/purchase').send({
      eventId:       soldOutEventId,
      customerEmail: 'latecomer@test.com',
      tenantId,
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('SOLD_OUT');
  });
});

// ── BB-18 ─────────────────────────────────────────────────────────────────────

describe('BB-18 | POST /api/tickets/purchase — same email twice creates only one user row', () => {
  it('connectOrCreate is idempotent — exactly 1 user row exists for the email', async () => {
    const email = 'repeat-buyer@test.com';

    await agent.post('/api/tickets/purchase').send({ eventId, customerEmail: email, tenantId });
    await agent.post('/api/tickets/purchase').send({ eventId, customerEmail: email, tenantId });

    const users = await prisma.user.findMany({ where: { email } });
    expect(users).toHaveLength(1);
  });
});
