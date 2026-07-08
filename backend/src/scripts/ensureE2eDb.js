/**
 * Creates the eventia_e2e database if it doesn't exist yet.
 * Invoked by the Playwright global-setup before migrate/seed.
 */
const { Pool } = require('pg');

const TARGET = process.env.E2E_DB_NAME || 'eventia_e2e';
// Connect to the maintenance DB to issue CREATE DATABASE.
const ADMIN_URL = process.env.E2E_ADMIN_URL || 'postgresql://admin:password123@localhost:5432/postgres';

(async () => {
  const pool = new Pool({ connectionString: ADMIN_URL });
  const client = await pool.connect();
  try {
    const { rowCount } = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [TARGET]);
    if (rowCount === 0) {
      await client.query(`CREATE DATABASE "${TARGET}"`);
      console.log(`✅  Created database ${TARGET}`);
    } else {
      console.log(`ℹ️   Database ${TARGET} already exists`);
    }
  } finally {
    client.release();
    await pool.end();
  }
})().catch((err) => {
  console.error('ensureE2eDb failed:', err.message);
  process.exit(1);
});
