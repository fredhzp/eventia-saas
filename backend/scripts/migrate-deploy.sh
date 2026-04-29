#!/bin/sh
# Baseline + migrate script for Render deployments.
#
# Problem: the database was previously managed with `prisma db push`, so tables
# exist but Prisma's _prisma_migrations history table does not. Running
# `migrate deploy` cold throws P3005 ("schema is not empty").
#
# Fix: mark the two already-applied migrations as resolved (creating the history
# table in the process), then deploy only the new migrations.
# The `|| true` makes each resolve a no-op if the migration is already recorded.

set -e

echo "==> Baselining existing migrations..."
npx prisma migrate resolve --applied 20260218115247_init_schema          2>&1 || true
npx prisma migrate resolve --applied 20260323145459_fix_optional_tenant  2>&1 || true

echo "==> Applying new migrations..."
npx prisma migrate deploy
