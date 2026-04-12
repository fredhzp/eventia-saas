/**
 * BLACK-BOX integration tests — Events API
 * Techniques: equivalence partitioning, boundary value analysis,
 *             multi-tenant isolation, RBAC boundary testing.
 */

const { agent, prisma, clearTestDb, register, bearer, decode } = require('../helpers');

const PW = 'Test1234!';

let orgToken, org2Token, tenantId, venueId, draftEventId;

beforeAll(async () => {
  await clearTestDb();

  // Shared venue used across event tests
  const venue = await prisma.venue.create({
    data: { name: 'Integration Test Venue', capacity: 500 },
  });
  venueId = venue.id;

  // Two separate organisers to test isolation and RBAC
  const r1 = await register('events-org1@test.com', PW, 'ORGANIZER');
  orgToken = r1.body.token;
  tenantId = decode(orgToken).tenantId;

  const r2 = await register('events-org2@test.com', PW, 'ORGANIZER');
  org2Token = r2.body.token;
});

afterAll(() => clearTestDb());

// ── BB-06 ─────────────────────────────────────────────────────────────────────

describe('BB-06 | POST /api/events — authenticated organiser creates DRAFT event', () => {
  it('returns 201 and the new event has status DRAFT', async () => {
    const res = await agent
      .post('/api/events')
      .set(bearer(orgToken))
      .send({ title: 'Spring Gala', date: '2027-05-01T20:00:00Z', venueId, tenantId });

    expect(res.status).toBe(201);
    expect(res.body.event.status).toBe('DRAFT');
    draftEventId = res.body.event.id; // saved for later tests
  });
});

// ── BB-07 ─────────────────────────────────────────────────────────────────────

describe('BB-07 | POST /api/events — no JWT returns 401', () => {
  it('rejects unauthenticated request with 401', async () => {
    const res = await agent
      .post('/api/events')
      .send({ title: 'No Auth Event', date: '2027-06-01T18:00:00Z', venueId, tenantId });

    expect(res.status).toBe(401);
  });
});

// ── BB-08 ─────────────────────────────────────────────────────────────────────

describe('BB-08 | POST /api/events — invalid date returns 400', () => {
  it('returns 400 when date cannot be parsed', async () => {
    const res = await agent
      .post('/api/events')
      .set(bearer(orgToken))
      .send({ title: 'Bad Date Event', date: 'not-a-date', venueId, tenantId });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });
});

// ── BB-09 ─────────────────────────────────────────────────────────────────────

describe('BB-09 | GET /api/events/stats — returns own tenant events', () => {
  it('includes the event created in BB-06', async () => {
    const res = await agent.get(`/api/events?tenantId=${tenantId}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const titles = res.body.map(e => e.title);
    expect(titles).toContain('Spring Gala');
  });
});

// ── BB-10 ─────────────────────────────────────────────────────────────────────

describe('BB-10 | GET /api/events/stats — multi-tenant isolation', () => {
  it('returns empty array for a different tenant (tenant B sees none of tenant A events)', async () => {
    const org2TenantId = decode(org2Token).tenantId;
    const res = await agent.get(`/api/events?tenantId=${org2TenantId}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

// ── BB-11 ─────────────────────────────────────────────────────────────────────

describe('BB-11 | GET /api/events/public — only PUBLISHED events are returned', () => {
  it('published event appears; DRAFT events are excluded', async () => {
    // Publish the event from BB-06
    await agent
      .patch(`/api/events/${draftEventId}/status`)
      .set(bearer(orgToken))
      .send({ status: 'PUBLISHED' });

    const res = await agent.get('/api/events/public');

    expect(res.status).toBe(200);
    const statuses = res.body.map(e => e.status);
    expect(statuses.every(s => s === 'PUBLISHED')).toBe(true);
    expect(res.body.some(e => e.id === draftEventId)).toBe(true);
  });
});

// ── BB-12 ─────────────────────────────────────────────────────────────────────

describe('BB-12 | PATCH /api/events/:id/status — owner can publish', () => {
  it('returns 200 with updated status PUBLISHED', async () => {
    // Create a fresh DRAFT event to publish
    const created = await agent
      .post('/api/events')
      .set(bearer(orgToken))
      .send({ title: 'To Publish', date: '2027-08-10T19:00:00Z', venueId, tenantId });
    const newEventId = created.body.event.id;

    const res = await agent
      .patch(`/api/events/${newEventId}/status`)
      .set(bearer(orgToken))
      .send({ status: 'PUBLISHED' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('PUBLISHED');
  });
});

// ── BB-13 ─────────────────────────────────────────────────────────────────────

describe('BB-13 | PATCH /api/events/:id/status — different tenant returns 403', () => {
  it('returns 403 Forbidden when token belongs to another tenant', async () => {
    const res = await agent
      .patch(`/api/events/${draftEventId}/status`)
      .set(bearer(org2Token))
      .send({ status: 'CANCELLED' });

    expect(res.status).toBe(403);
  });
});

// ── BB-14 ─────────────────────────────────────────────────────────────────────

describe('BB-14 | PATCH /api/events/:id/status — no JWT returns 401', () => {
  it('rejects unauthenticated status change with 401', async () => {
    const res = await agent
      .patch(`/api/events/${draftEventId}/status`)
      .send({ status: 'PUBLISHED' });

    expect(res.status).toBe(401);
  });
});
