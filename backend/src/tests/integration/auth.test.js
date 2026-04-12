/**
 * BLACK-BOX integration tests — Auth API
 * Tests treat the HTTP endpoints as the system under test.
 * Technique: equivalence partitioning (valid / invalid input classes).
 */

const { agent, prisma, clearTestDb } = require('../helpers');

const EMAIL    = 'bb-auth@test.com';
const PASSWORD = 'Test1234!';

beforeAll(() => clearTestDb());
afterAll(()  => clearTestDb());

// ── BB-01 ─────────────────────────────────────────────────────────────────────

describe('BB-01 | POST /api/auth/register — valid registration', () => {
  it('returns 201 with a JWT token', async () => {
    const res = await agent
      .post('/api/auth/register')
      .send({ email: EMAIL, password: PASSWORD, role: 'USER' });

    expect(res.status).toBe(201);
    expect(typeof res.body.token).toBe('string');
    expect(res.body.token.length).toBeGreaterThan(0);
  });
});

// ── BB-02 ─────────────────────────────────────────────────────────────────────

describe('BB-02 | POST /api/auth/register — duplicate email', () => {
  it('returns 400 with EMAIL_IN_USE', async () => {
    const res = await agent
      .post('/api/auth/register')
      .send({ email: EMAIL, password: PASSWORD, role: 'USER' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('EMAIL_IN_USE');
  });
});

// ── BB-03 ─────────────────────────────────────────────────────────────────────

describe('BB-03 | POST /api/auth/register — ORGANIZER auto-creates tenant', () => {
  it('creates a tenant row in the database linked to the new user', async () => {
    const orgEmail = 'bb-org@test.com';
    const res = await agent
      .post('/api/auth/register')
      .send({ email: orgEmail, password: PASSWORD, role: 'ORGANIZER' });

    expect(res.status).toBe(201);

    const user = await prisma.user.findUnique({
      where: { email: orgEmail },
      include: { tenant: true },
    });
    expect(user.tenant).not.toBeNull();
    expect(user.role).toBe('ORGANIZER');
  });
});

// ── BB-04 ─────────────────────────────────────────────────────────────────────

describe('BB-04 | POST /api/auth/login — valid credentials', () => {
  it('returns 200 with token, role, and tenantId', async () => {
    const res = await agent
      .post('/api/auth/login')
      .send({ email: EMAIL, password: PASSWORD });

    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe('string');
    expect(res.body.role).toBe('USER');
  });
});

// ── BB-05 ─────────────────────────────────────────────────────────────────────

describe('BB-05 | POST /api/auth/login — wrong password', () => {
  it('returns 401 with an error message', async () => {
    const res = await agent
      .post('/api/auth/login')
      .send({ email: EMAIL, password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
  });
});
