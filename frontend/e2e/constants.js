// Single source of truth shared by playwright.config.js, global-setup.js,
// the test helpers, and the specs. The e2e stack runs on dedicated ports so it
// never collides with a running dev stack (backend :4000 / frontend :5173).
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url)); // frontend/e2e

export const BACKEND_PORT = 4100;
export const FRONTEND_PORT = 5175;
export const BACKEND_URL = `http://localhost:${BACKEND_PORT}`;
export const FRONTEND_URL = `http://localhost:${FRONTEND_PORT}`;

// Dedicated e2e database — created/migrated/seeded fresh by global-setup.js.
// Kept separate from eventia_db (dev/demo) and eventia_test (jest).
export const E2E_DB_URL = 'postgresql://admin:password123@localhost:5432/eventia_e2e';
export const JWT_SECRET = 'e2e_test_secret';

// Written by global-setup, read by the expired-token spec.
export const EXPIRED_TOKEN_PATH = join(HERE, '.auth', 'expired.txt');

// Seeded accounts (see backend/src/scripts/seed.js).
export const ORG_ZOUK = { email: 'organizer@zouk.com', password: 'Password1!', tenant: 'Zouk Events' };
export const ORG_ESPLANADE = { email: 'organizer@esplanade.com', password: 'Password1!', tenant: 'Esplanade Presents' };

// Seeded events used for deterministic assertions.
export const EVENTS = {
  zoukPublished: 'Disclosure: Live at Zouk',        // PUBLISHED, 680/800 — has headroom to buy
  esplanadePublished: 'Nathan Hartono: One Night Only', // PUBLISHED, other tenant
  soldOut: 'E2E Sold Out Test Show',                // added by seedE2E.js, filled to capacity
};
