/**
 * Prints an already-expired JWT (to stdout) signed with the same secret the
 * backend verifies with. Used by the Playwright global-setup to test that
 * protected endpoints reject stale credentials.
 */
const jwt = require('jsonwebtoken');

const secret = process.env.JWT_SECRET || 'e2e_test_secret';
// Mirrors the real payload shape from authService.generateJWT; exp 1h in the past.
const token = jwt.sign(
  { userId: 'e2e-expired-user', role: 'ORGANIZER', tenantId: 'e2e-expired-tenant' },
  secret,
  { expiresIn: -3600 },
);

process.stdout.write(token);
