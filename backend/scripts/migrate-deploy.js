/**
 * Render deploy helper — baselines Prisma migration history then runs migrate deploy.
 *
 * Handles three scenarios that arise when a DB was previously managed with db push:
 *   P3005 — no _prisma_migrations table yet (first migration run)
 *   P3009 — a previous migration attempt failed and is stuck; cleared before retry
 *   Normal — history exists and is clean; only new migrations are applied
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { execSync } = require('child_process');
const { Pool }     = require('pg');
const crypto       = require('crypto');
const fs           = require('fs');
const path         = require('path');

const MIGRATIONS_DIR = path.join(__dirname, '../prisma/migrations');

// Migrations already in the DB (via db push) that have no history record yet.
const BASELINE_MIGRATIONS = [
  '20260218115247_init_schema',
  '20260323145459_fix_optional_tenant',
];

async function ensureHistoryTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      "id"                  VARCHAR(36)  NOT NULL PRIMARY KEY,
      "checksum"            VARCHAR(64)  NOT NULL,
      "finished_at"         TIMESTAMPTZ,
      "migration_name"      VARCHAR(255) NOT NULL,
      "logs"                TEXT,
      "rolled_back_at"      TIMESTAMPTZ,
      "started_at"          TIMESTAMPTZ NOT NULL DEFAULT now(),
      "applied_steps_count" INTEGER     NOT NULL DEFAULT 0
    )
  `);
  console.log('✅  _prisma_migrations table ready');
}

async function baseline(pool) {
  for (const name of BASELINE_MIGRATIONS) {
    const { rows } = await pool.query(
      'SELECT id FROM "_prisma_migrations" WHERE migration_name = $1',
      [name]
    );
    if (rows.length > 0) {
      console.log(`⏭️   ${name} — already recorded, skipping`);
      continue;
    }

    const sqlPath  = path.join(MIGRATIONS_DIR, name, 'migration.sql');
    const sql      = fs.readFileSync(sqlPath, 'utf8');
    const checksum = crypto.createHash('sha256').update(sql).digest('hex');

    await pool.query(
      `INSERT INTO "_prisma_migrations"
         (id, checksum, finished_at, migration_name, logs, started_at, applied_steps_count)
       VALUES ($1, $2, now(), $3, NULL, now(), 1)`,
      [crypto.randomUUID(), checksum, name]
    );
    console.log(`✅  Baselined: ${name}`);
  }
}

async function clearFailedMigrations(pool) {
  // P3009: if any migration is marked failed (finished_at IS NULL, rolled_back_at IS NULL)
  // delete it so migrate deploy can retry it cleanly.
  const { rows } = await pool.query(`
    SELECT migration_name FROM "_prisma_migrations"
    WHERE finished_at IS NULL AND rolled_back_at IS NULL
  `);

  if (rows.length === 0) return;

  for (const { migration_name } of rows) {
    await pool.query(
      'DELETE FROM "_prisma_migrations" WHERE migration_name = $1',
      [migration_name]
    );
    console.log(`🗑️   Cleared failed migration: ${migration_name} (will be retried)`);
  }
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    console.log('==> Preparing migration history…');
    await ensureHistoryTable(pool);
    await baseline(pool);
    await clearFailedMigrations(pool);
  } finally {
    await pool.end();
  }

  console.log('==> Running prisma migrate deploy…');
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });
}

main().catch(err => { console.error(err); process.exit(1); });
