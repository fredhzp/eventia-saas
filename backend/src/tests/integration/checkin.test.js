/**
 * BLACK-BOX integration tests — Ticket Check-in API
 * Techniques: state-based testing (first scan vs. duplicate scan),
 *             equivalence partitioning (valid / unknown / missing QR code).
 */

const { agent, prisma, clearTestDb, register, bearer, decode } = require('../helpers');

const PW = 'Test1234!';

let qrCode;

beforeAll(async () => {
  await clearTestDb();

  const venue = await prisma.venue.create({
    data: { name: 'Checkin Test Venue', capacity: 100 },
  });

  const r = await register('checkin-org@test.com', PW, 'ORGANIZER');
  const token = r.body.token;
  const tenantId = decode(token).tenantId;

  const evtRes = await agent
    .post('/api/events')
    .set(bearer(token))
    .send({ title: 'Checkin Test Event', date: '2027-10-01T18:00:00Z', venueId: venue.id, tenantId });
  const eventId = evtRes.body.event.id;

  await agent
    .patch(`/api/events/${eventId}/status`)
    .set(bearer(token))
    .send({ status: 'PUBLISHED' });

  const purchaseRes = await agent.post('/api/tickets/purchase').send({
    eventId,
    customerEmail: 'attendee@test.com',
    tenantId,
  });
  qrCode = purchaseRes.body.ticket.qrCode;
});

afterAll(() => clearTestDb());

// ── BB-23 ─────────────────────────────────────────────────────────────────────

describe('BB-23 | POST /api/tickets/checkin — valid QR code', () => {
  it('returns 200 with checkedInAt timestamp and buyerEmail', async () => {
    const res = await agent.post('/api/tickets/checkin').send({ qrCode });

    expect(res.status).toBe(200);
    expect(res.body.ticket).toBeDefined();
    expect(res.body.ticket.checkedInAt).not.toBeNull();
    expect(res.body.ticket.buyerEmail).toBe('attendee@test.com');
  });
});

// ── BB-24 ─────────────────────────────────────────────────────────────────────

describe('BB-24 | POST /api/tickets/checkin — duplicate scan of same QR code', () => {
  it('returns 409 ALREADY_CHECKED_IN with the original checkedInAt timestamp', async () => {
    // qrCode was already scanned in BB-23
    const res = await agent.post('/api/tickets/checkin').send({ qrCode });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('ALREADY_CHECKED_IN');
    expect(res.body.checkedInAt).toBeDefined();
  });
});

// ── BB-25 ─────────────────────────────────────────────────────────────────────

describe('BB-25 | POST /api/tickets/checkin — non-existent QR code', () => {
  it('returns 404 TICKET_NOT_FOUND for an unknown QR string', async () => {
    const res = await agent
      .post('/api/tickets/checkin')
      .send({ qrCode: 'QR-00000000-0000-0000-0000-000000000000' });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('TICKET_NOT_FOUND');
  });
});

// ── BB-26 ─────────────────────────────────────────────────────────────────────

describe('BB-26 | POST /api/tickets/checkin — missing qrCode field', () => {
  it('returns 400 when qrCode is absent from the request body', async () => {
    const res = await agent.post('/api/tickets/checkin').send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });
});
