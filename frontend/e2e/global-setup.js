// Runs once before the web servers start. Builds a known-good eventia_e2e
// database from scratch and materialises an expired JWT for the auth spec.
//
// All DB/crypto work is delegated to backend scripts (where pg / prisma /
// jsonwebtoken live); this file is pure orchestration using Node core only.
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import { E2E_DB_URL, JWT_SECRET, EXPIRED_TOKEN_PATH } from './constants.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const BACKEND = join(HERE, '..', '..', 'backend');

export default async function globalSetup() {
  const env = { ...process.env, DATABASE_URL: E2E_DB_URL, JWT_SECRET, NODE_ENV: 'e2e' };
  const run = (cmd) => {
    console.log(`\n[e2e setup] ${cmd}`);
    execSync(cmd, { cwd: BACKEND, env, stdio: 'inherit' });
  };

  run('node src/scripts/ensureE2eDb.js');      // CREATE DATABASE eventia_e2e if missing
  run('npx prisma migrate deploy');            // apply schema
  run('node src/scripts/seed.js');             // demo data (tenants, events, tickets)
  run('node src/scripts/seedE2E.js');          // add one deterministic sold-out event

  // Materialise an already-expired token signed with the same secret the
  // backend verifies with, so the "stale credentials are rejected" spec is real.
  const token = execSync('node src/scripts/e2eExpiredToken.js', { cwd: BACKEND, env }).toString().trim();
  mkdirSync(dirname(EXPIRED_TOKEN_PATH), { recursive: true });
  writeFileSync(EXPIRED_TOKEN_PATH, token);
  console.log('\n[e2e setup] ✅ database seeded and expired token written\n');
}
