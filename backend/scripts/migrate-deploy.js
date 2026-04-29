/**
 * Render deploy helper — baselines Prisma migration history then runs migrate deploy.
 *
 * Problem: the database was previously managed with `prisma db push`, so tables
 * exist but the _prisma_migrations history table does not. `prisma migrate deploy`
 * throws P3005 ("schema is not empty") when this is the case.
 *
 * Fix: create the history table if absent, insert records for migrations that are
 * already applied (using the real SHA-256 checksums Prisma expects), then hand off
 * to `prisma migrate deploy` which applies only genuinely new migrations.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { execSync } = require('child_process');
const { Pool }     = require('pg');
const crypto       = require('crypto');
const fs           = require('fs');
const path         = require('path');

const MIGRATIONS_DIR = path.join(__dirname, '../prisma/migrations');

// Migrations that already exist in the DB (created via db push) but are not yet
// recorded in _prisma_migrations. Add new ones here before running migrate deploy
// for the first time after any future db-push-based schema change.
const BASELINE_MIGRATIONS = [
  '20260218115247_init_schema',
  '20260323145459_fix_optional_tenant',
];

async function baseline(pool) {
  // Create history table if it doesn't exist
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

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    console.log('==> Baselining migration history…');
    await baseline(pool);
  } finally {
    await pool.end();
  }

  console.log('==> Running prisma migrate deploy…');
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });
}

main().catch(err => { console.error(err); process.exit(1); });
