/**
 * WHITE-BOX unit tests for authService.js
 * All external dependencies (Prisma, bcrypt, userRepository) are mocked.
 * Tests verify internal branch logic without touching the database.
 */

jest.mock('../../lib/prisma', () => ({
  tenant: { create: jest.fn() },
}));
jest.mock('../../repositories/userRepository');
jest.mock('bcryptjs');

const userRepo    = require('../../repositories/userRepository');
const prisma      = require('../../lib/prisma');
const bcrypt      = require('bcryptjs');
const jwt         = require('jsonwebtoken');
const authService = require('../../services/authService');

beforeEach(() => jest.clearAllMocks());

// ── registerUser ─────────────────────────────────────────────────────────────

describe('WB-01 | registerUser — USER role does not create a tenant', () => {
  it('prisma.tenant.create is NOT called and returned user has tenantId: null', async () => {
    userRepo.findByEmail.mockResolvedValue(null);
    bcrypt.genSalt.mockResolvedValue('salt');
    bcrypt.hash.mockResolvedValue('hashed');
    userRepo.save.mockResolvedValue({ id: 'u1', email: 'wb01@test.com', role: 'USER', tenantId: null });

    const result = await authService.registerUser('wb01@test.com', 'pw', 'USER');

    expect(prisma.tenant.create).not.toHaveBeenCalled();
    expect(result.tenantId).toBeNull();
  });
});

describe('WB-02 | registerUser — ORGANIZER role auto-creates a tenant', () => {
  it('prisma.tenant.create is called once and user has tenantId set', async () => {
    userRepo.findByEmail.mockResolvedValue(null);
    bcrypt.genSalt.mockResolvedValue('salt');
    bcrypt.hash.mockResolvedValue('hashed');
    prisma.tenant.create.mockResolvedValue({ id: 'tenant-1', name: "wb02's Organization" });
    userRepo.save.mockResolvedValue({ id: 'u2', email: 'wb02@test.com', role: 'ORGANIZER', tenantId: 'tenant-1' });

    const result = await authService.registerUser('wb02@test.com', 'pw', 'ORGANIZER');

    expect(prisma.tenant.create).toHaveBeenCalledTimes(1);
    expect(result.tenantId).toBe('tenant-1');
  });
});

describe('WB-03 | registerUser — duplicate email throws EMAIL_IN_USE', () => {
  it('throws Error("EMAIL_IN_USE") when email already exists', async () => {
    userRepo.findByEmail.mockResolvedValue({ id: 'u-existing' });

    await expect(authService.registerUser('dup@test.com', 'pw', 'USER'))
      .rejects.toThrow('EMAIL_IN_USE');
  });
});

// ── verifyCredentials ─────────────────────────────────────────────────────────

describe('WB-04 | verifyCredentials — correct password returns user', () => {
  it('returns the user object when password matches', async () => {
    const mockUser = { id: 'u3', email: 'wb04@test.com', passwordHash: 'hash' };
    userRepo.findByEmail.mockResolvedValue(mockUser);
    bcrypt.compare.mockResolvedValue(true);

    const result = await authService.verifyCredentials('wb04@test.com', 'correctpw');
    expect(result).toEqual(mockUser);
  });
});

describe('WB-05 | verifyCredentials — wrong password throws INVALID_CREDENTIALS', () => {
  it('throws when bcrypt.compare returns false', async () => {
    userRepo.findByEmail.mockResolvedValue({ id: 'u4', passwordHash: 'hash' });
    bcrypt.compare.mockResolvedValue(false);

    await expect(authService.verifyCredentials('wb05@test.com', 'wrongpw'))
      .rejects.toThrow('INVALID_CREDENTIALS');
  });
});

describe('WB-06 | verifyCredentials — unknown email throws INVALID_CREDENTIALS', () => {
  it('throws when userRepository returns null', async () => {
    userRepo.findByEmail.mockResolvedValue(null);

    await expect(authService.verifyCredentials('nobody@test.com', 'pw'))
      .rejects.toThrow('INVALID_CREDENTIALS');
  });
});

// ── generateJWT ───────────────────────────────────────────────────────────────

describe('WB-07 | generateJWT — token payload contains userId, role, tenantId', () => {
  it('decoded token has the correct claims', () => {
    const mockUser = { id: 'user-abc', role: 'ORGANIZER', tenantId: 'tenant-xyz' };
    const token = authService.generateJWT(mockUser);
    const decoded = jwt.decode(token);

    expect(decoded.userId).toBe('user-abc');
    expect(decoded.role).toBe('ORGANIZER');
    expect(decoded.tenantId).toBe('tenant-xyz');
  });
});
