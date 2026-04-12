/**
 * BLACK-BOX integration tests — Admin API
 * Techniques: RBAC boundary testing (ADMIN vs ORGANIZER vs unauthenticated),
 *             FK constraint edge case (delete venue with associated events).
 */

const bcrypt = require('bcryptjs');
const { agent, prisma, clearTestDb, register, bearer } = require('../helpers');

const PW = 'Admin1234!';

let adminToken, orgToken, venueWithEventsId;

beforeAll(async () => {
  await clearTestDb();

  // Create ADMIN user directly (no registration endpoint for this role)
  const hash = await bcrypt.hash(PW, 10);
  await prisma.user.create({
    data: { email: 'admin-test@test.com', passwordHash: hash, role: 'ADMIN' },
  });
  const loginRes = await agent
    .post('/api/auth/login')
    .send({ email: 'admin-test@test.com', password: PW });
  adminToken = loginRes.body.token;

  // Register an ORGANIZER for the 403 test
  const orgRes = await register('admin-org@test.com', PW, 'ORGANIZER');
  orgToken = orgRes.body.token;

  // Create a venue + tenant + event for the FK-constraint delete test
  const venue = await prisma.venue.create({
    data: { name: 'Undeletable Venue', capacity: 100 },
  });
  venueWithEventsId = venue.id;

  const tenant = await prisma.tenant.create({ data: { name: 'Admin Test Tenant' } });

  await prisma.event.create({
    data: {
      title:     'Blocking Event',
      startTime: new Date('2027-10-01T18:00:00Z'),
      status:    'DRAFT',
      venueId:   venue.id,
      tenantId:  tenant.id,
    },
  });
});

afterAll(() => clearTestDb());

// ── BB-19 ─────────────────────────────────────────────────────────────────────

describe('BB-19 | GET /api/admin/tenants — ADMIN JWT returns 200', () => {
  it('returns an array of tenants with user/event counts', async () => {
    const res = await agent
      .get('/api/admin/tenants')
      .set(bearer(adminToken));

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });
});

// ── BB-20 ─────────────────────────────────────────────────────────────────────

describe('BB-20 | GET /api/admin/tenants — ORGANIZER JWT returns 403', () => {
  it('returns 403 Forbidden for non-ADMIN role', async () => {
    const res = await agent
      .get('/api/admin/tenants')
      .set(bearer(orgToken));

    expect(res.status).toBe(403);
  });
});

// ── BB-21 ─────────────────────────────────────────────────────────────────────

describe('BB-21 | GET /api/admin/tenants — no JWT returns 401', () => {
  it('returns 401 when Authorization header is absent', async () => {
    const res = await agent.get('/api/admin/tenants');

    expect(res.status).toBe(401);
  });
});

// ── BB-22 ─────────────────────────────────────────────────────────────────────

describe('BB-22 | DELETE /api/admin/venues/:id — venue with events returns 500', () => {
  it('returns 500 when FK constraint prevents deletion', async () => {
    const res = await agent
      .delete(`/api/admin/venues/${venueWithEventsId}`)
      .set(bearer(adminToken));

    expect(res.status).toBe(500);
    expect(res.body.error).toBeDefined();
  });
});
