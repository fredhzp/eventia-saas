/**
 * E2E seed augment — runs AFTER the normal seed (src/scripts/seed.js).
 *
 * The demo seed intentionally ships no fully-sold-out event (its closest is
 * 1760/1800). The Playwright suite needs a deterministic sold-out event to
 * prove the "purchase is cleanly rejected at capacity" path, so we add exactly
 * one here: a PUBLISHED event at the smallest venue, filled to capacity.
 *
 * Kept out of the main seed so the demo data described in CREDENTIALS.md stays
 * unchanged. Invoked by frontend/e2e/global-setup.js against the eventia_e2e DB.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const crypto = require('crypto');
const prisma = require('../lib/prisma');

const SOLD_OUT_TITLE = 'E2E Sold Out Test Show';
const daysFromNow = (n) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);
const uuid = () => crypto.randomUUID();

async function main() {
  // Use the smallest venue so "fill to capacity" is a couple of cheap bulk inserts.
  const venue = await prisma.venue.findFirst({ orderBy: { capacity: 'asc' } });
  const tenant = await prisma.tenant.findFirst({ where: { name: 'Suntec Live' } });
  if (!venue || !tenant) {
    throw new Error('seedE2E: expected the base seed to have run first (missing venue/tenant)');
  }

  // Idempotent: remove any prior copy (and its tickets/orders) before recreating.
  const existing = await prisma.event.findFirst({ where: { title: SOLD_OUT_TITLE } });
  if (existing) {
    const tickets = await prisma.ticket.findMany({ where: { eventId: existing.id }, select: { orderId: true } });
    await prisma.ticket.deleteMany({ where: { eventId: existing.id } });
    await prisma.order.deleteMany({ where: { id: { in: tickets.map((t) => t.orderId) } } });
    await prisma.event.delete({ where: { id: existing.id } });
  }

  const event = await prisma.event.create({
    data: {
      title: SOLD_OUT_TITLE,
      startTime: daysFromNow(7),
      status: 'PUBLISHED',
      tenantId: tenant.id,
      venueId: venue.id,
    },
  });

  // Fill to exactly capacity → sold >= capacity → SOLD_OUT.
  const orders = Array.from({ length: venue.capacity }, () => ({
    id: uuid(),
    totalAmount: 0,
    paymentStatus: 'PAID',
    buyerEmail: 'soldout-buyer@example.com',
  }));
  await prisma.order.createMany({ data: orders });
  await prisma.ticket.createMany({
    data: orders.map((o) => ({ id: uuid(), qrCode: `QR-${uuid()}`, orderId: o.id, eventId: event.id })),
  });

  console.log(`✅  E2E sold-out event created: "${SOLD_OUT_TITLE}" (${venue.capacity}/${venue.capacity} at ${venue.name})`);
}

main()
  .catch((err) => {
    console.error('seedE2E failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
