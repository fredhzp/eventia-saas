require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

// Safety guard: in production this script only runs when SEED_DB=true is set explicitly.
// This prevents an accidental deploy from wiping live data.
if (process.env.NODE_ENV === 'production' && process.env.SEED_DB !== 'true') {
  console.log('ℹ️   Seed skipped (set SEED_DB=true to run in production).');
  process.exit(0);
}

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const TimeSeriesAI = require('../services/forecast/TimeSeriesAI');

const daysFromNow = (n) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);
const hoursAgo    = (n) => new Date(Date.now() - n * 60 * 60 * 1000);
const qr          = ()  => `QR-${crypto.randomUUID()}`;
const uuid        = ()  => crypto.randomUUID();

// Create N tickets for an event via two bulk inserts (fast).
// checkedInCount tickets will have a checkedInAt timestamp.
async function createTickets(eventId, count, checkedInCount = 0, priceEach = 88) {
  const emails = [
    'alice@example.com', 'bob@example.com', 'carol@example.com', 'dave@example.com',
    'eve@example.com',   'frank@example.com','grace@example.com', 'henry@example.com',
    'irene@example.com', 'jack@example.com', 'kate@example.com',  'liam@example.com',
    'mia@example.com',   'noah@example.com', 'olivia@example.com','peter@example.com',
    'quinn@example.com', 'rose@example.com', 'sam@example.com',   'tina@example.com',
  ];

  const orders = Array.from({ length: count }, (_, i) => ({
    id:            uuid(),
    totalAmount:   priceEach,
    paymentStatus: 'PAID',
    buyerEmail:    emails[i % emails.length],
  }));

  await prisma.order.createMany({ data: orders });

  await prisma.ticket.createMany({
    data: orders.map((order, i) => ({
      id:          uuid(),
      qrCode:      qr(),
      checkedInAt: i < checkedInCount
        ? hoursAgo(Math.floor(Math.random() * 4) + 1)
        : null,
      orderId:  order.id,
      eventId,
    })),
  });
}

async function main() {
  console.log('🌱  Seeding Eventia database…\n');

  // ── 0. Clear all tables (reverse FK order) ────────────────────────────────
  await prisma.demandForecast.deleteMany();
  await prisma.salesSnapshot.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.order.deleteMany();
  await prisma.eventArtistLink.deleteMany();
  await prisma.event.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenant.deleteMany();
  await prisma.venue.deleteMany();
  await prisma.artist.deleteMany();
  console.log('🗑️   Cleared existing data');

  // ── 1. Admin (no tenant) ──────────────────────────────────────────────────
  const adminHash = await bcrypt.hash('admin', 10);
  await prisma.user.create({
    data: { email: 'admin@admin.com', passwordHash: adminHash, role: 'ADMIN' },
  });
  console.log('✅  Admin created: admin@admin.com / admin');

  // ── 2. Tenants + Organizers ───────────────────────────────────────────────
  const pwHash = await bcrypt.hash('Password1!', 10);

  const [tZouk, tEsplanade, tSuntec] = await Promise.all([
    prisma.tenant.create({ data: { name: 'Zouk Events',       apiKey: uuid(), subscriptionStatus: 'ACTIVE' } }),
    prisma.tenant.create({ data: { name: 'Esplanade Presents',apiKey: uuid(), subscriptionStatus: 'ACTIVE' } }),
    prisma.tenant.create({ data: { name: 'Suntec Live',       apiKey: uuid(), subscriptionStatus: 'ACTIVE' } }),
  ]);

  await Promise.all([
    prisma.user.create({ data: { email: 'organizer@zouk.com',       passwordHash: pwHash, role: 'ORGANIZER', tenantId: tZouk.id       } }),
    prisma.user.create({ data: { email: 'organizer@esplanade.com',  passwordHash: pwHash, role: 'ORGANIZER', tenantId: tEsplanade.id  } }),
    prisma.user.create({ data: { email: 'organizer@suntec.com',     passwordHash: pwHash, role: 'ORGANIZER', tenantId: tSuntec.id     } }),
  ]);
  console.log('✅  Tenants & organizers created');

  // ── 3. Venues ─────────────────────────────────────────────────────────────
  const [vZouk, vHall, vArena, vLounge] = await Promise.all([
    prisma.venue.create({ data: { name: 'Zouk Main Room',         capacity: 800,  geoLat: 1.2830, geoLong: 103.8370 } }),
    prisma.venue.create({ data: { name: 'Esplanade Concert Hall', capacity: 1800, geoLat: 1.2895, geoLong: 103.8554 } }),
    prisma.venue.create({ data: { name: 'Suntec Arena',           capacity: 5000, geoLat: 1.2940, geoLong: 103.8579 } }),
    prisma.venue.create({ data: { name: 'Kilo Lounge',            capacity: 200,  geoLat: 1.2994, geoLong: 103.8456 } }),
  ]);
  console.log('✅  Venues created');

  // ── 4. Artists ────────────────────────────────────────────────────────────
  const [disclosure, digweed, hartono, samWillows, subsonic, gentleBones, linying, inchChua] =
    await Promise.all([
      prisma.artist.create({ data: { name: 'Disclosure',            genre: 'Electronic',       popularityScore: 93 } }),
      prisma.artist.create({ data: { name: 'Sasha & John Digweed',  genre: 'Progressive House',popularityScore: 86 } }),
      prisma.artist.create({ data: { name: 'Nathan Hartono',        genre: 'Pop',              popularityScore: 79 } }),
      prisma.artist.create({ data: { name: 'The Sam Willows',       genre: 'Indie Pop',        popularityScore: 74 } }),
      prisma.artist.create({ data: { name: 'Subsonic Eye',          genre: 'Indie Rock',       popularityScore: 61 } }),
      prisma.artist.create({ data: { name: 'Gentle Bones',          genre: 'R&B Soul',         popularityScore: 76 } }),
      prisma.artist.create({ data: { name: 'Linying',               genre: 'Pop',              popularityScore: 64 } }),
      prisma.artist.create({ data: { name: 'Inch Chua',             genre: 'Folk',             popularityScore: 58 } }),
    ]);
  console.log('✅  Artists created');

  // ── 5. Events ─────────────────────────────────────────────────────────────
  // Zouk
  const eDisclosure = await prisma.event.create({ data: { title: 'Disclosure: Live at Zouk',           startTime: daysFromNow(18),  status: 'PUBLISHED', tenantId: tZouk.id,      venueId: vZouk.id  } });
  const eDigweed    = await prisma.event.create({ data: { title: 'Sasha & John Digweed: Classics Night',startTime: daysFromNow(45),  status: 'PUBLISHED', tenantId: tZouk.id,      venueId: vZouk.id  } });
  /*const eNYE     =*/ await prisma.event.create({ data: { title: 'NYE Countdown 2027',                 startTime: daysFromNow(246), status: 'DRAFT',     tenantId: tZouk.id,      venueId: vZouk.id  } });

  // Esplanade
  const eHartono    = await prisma.event.create({ data: { title: 'Nathan Hartono: One Night Only',      startTime: daysFromNow(12),  status: 'PUBLISHED', tenantId: tEsplanade.id, venueId: vHall.id  } });
  const eSamWillows = await prisma.event.create({ data: { title: 'The Sam Willows: Encore Tour',        startTime: daysFromNow(30),  status: 'PUBLISHED', tenantId: tEsplanade.id, venueId: vHall.id  } });

  // Suntec
  const eFestival   = await prisma.event.create({ data: { title: 'Singapore Music Festival 2026',       startTime: daysFromNow(60),  status: 'PUBLISHED', tenantId: tSuntec.id,    venueId: vArena.id } });
  const eSubsonic   = await prisma.event.create({ data: { title: 'Subsonic Eye: Album Launch',          startTime: daysFromNow(1),   status: 'PUBLISHED', tenantId: tSuntec.id,    venueId: vLounge.id} });
  /*const eCancelled=*/ await prisma.event.create({ data: { title: 'Pop Showcase (Cancelled)',           startTime: daysFromNow(20),  status: 'CANCELLED', tenantId: tSuntec.id,    venueId: vArena.id } });
  console.log('✅  Events created');

  // ── 6. Artist → Event links ───────────────────────────────────────────────
  await prisma.eventArtistLink.createMany({
    data: [
      { eventId: eDisclosure.id,  artistId: disclosure.id,   isHeadliner: true  },
      { eventId: eDigweed.id,     artistId: digweed.id,      isHeadliner: true  },
      { eventId: eHartono.id,     artistId: hartono.id,      isHeadliner: true  },
      { eventId: eHartono.id,     artistId: gentleBones.id,  isHeadliner: false },
      { eventId: eSamWillows.id,  artistId: samWillows.id,   isHeadliner: true  },
      { eventId: eSamWillows.id,  artistId: linying.id,      isHeadliner: false },
      { eventId: eFestival.id,    artistId: disclosure.id,   isHeadliner: true  },
      { eventId: eFestival.id,    artistId: gentleBones.id,  isHeadliner: false },
      { eventId: eFestival.id,    artistId: inchChua.id,     isHeadliner: false },
      { eventId: eSubsonic.id,    artistId: subsonic.id,     isHeadliner: true  },
    ],
  });
  console.log('✅  Artist links created');

  // ── 7. Tickets ────────────────────────────────────────────────────────────
  // Event             Sold   Cap    Fill%   Check-ins   Price
  // Disclosure        680    800    85%     0           $98
  // Digweed           180    800    22%     0           $78
  // Hartono          1760   1800    98%     0           $128
  // Sam Willows       720   1800    40%     0           $68
  // Festival         1250   5000    25%     0           $148
  // Subsonic Eye      188    200    94%     165         $38  ← doors open tomorrow, check-ins live
  console.log('🎟️   Creating tickets…');
  await createTickets(eDisclosure.id,  680,    0, 98);
  await createTickets(eDigweed.id,     180,    0, 78);
  await createTickets(eHartono.id,    1760,    0, 128);
  await createTickets(eSamWillows.id,  720,    0, 68);
  await createTickets(eFestival.id,   1250,    0, 148);
  await createTickets(eSubsonic.id,    188,  165, 38);
  console.log('✅  Tickets created');

  // ── 8. Sales Snapshots (10 hourly readings per event) ────────────────────
  // Format: [hoursBack, totalSold, velocityPerHour]
  await prisma.salesSnapshot.createMany({ data: [
    // Disclosure — accelerating momentum
    ...[168,144,120,96,72,48,24,12,6,1].map((h, i) => ({ eventId: eDisclosure.id, recordedAt: hoursAgo(h),
      totalSold: [200,310,420,510,580,630,660,672,678,680][i], velocityPerHour: [5.2,7.1,8.3,9.0,11.2,12.5,14.8,16.0,17.3,18.1][i] })),

    // Digweed — slow, flat pace
    ...[168,144,120,96,72,48,24,12,6,1].map((h, i) => ({ eventId: eDigweed.id, recordedAt: hoursAgo(h),
      totalSold: [40,70,95,120,140,155,165,172,176,180][i], velocityPerHour: [0.9,1.2,1.1,1.3,1.0,1.4,1.2,1.3,1.4,1.5][i] })),

    // Hartono — explosive, near sellout
    ...[168,144,120,96,72,48,24,12,6,1].map((h, i) => ({ eventId: eHartono.id, recordedAt: hoursAgo(h),
      totalSold: [800,1050,1280,1450,1580,1660,1710,1740,1752,1760][i], velocityPerHour: [18.0,22.4,25.1,28.3,31.0,34.2,37.5,40.1,42.0,43.5][i] })),

    // Sam Willows — steady uptick
    ...[168,144,120,96,72,48,24,12,6,1].map((h, i) => ({ eventId: eSamWillows.id, recordedAt: hoursAgo(h),
      totalSold: [200,320,430,530,610,660,695,708,714,720][i], velocityPerHour: [4.1,5.8,6.2,7.0,7.5,8.1,8.9,9.4,9.8,10.2][i] })),

    // Festival — large venue, slow burn
    ...[168,144,120,96,72,48,24,12,6,1].map((h, i) => ({ eventId: eFestival.id, recordedAt: hoursAgo(h),
      totalSold: [400,600,780,920,1040,1120,1190,1220,1238,1250][i], velocityPerHour: [8.0,10.2,9.8,10.5,11.1,10.8,11.4,11.9,12.0,12.3][i] })),

    // Subsonic — tiny venue, now selling out; velocity plateauing
    ...[168,144,120,96,72,48,24,12,6,1].map((h, i) => ({ eventId: eSubsonic.id, recordedAt: hoursAgo(h),
      totalSold: [80,110,135,155,170,180,185,187,188,188][i], velocityPerHour: [3.8,5.1,6.0,7.2,8.5,9.8,11.0,12.5,13.0,0.0][i] })),
  ]});
  console.log('✅  Sales snapshots created');

  // ── 9. Demand Forecasts — generated by the real AI service ───────────────
  const forecaster = new TimeSeriesAI();

  const forecastInputs = [
    { event: eDisclosure,  venueCapacity: vZouk.capacity,   ticketsSold: 680,  artistPopularity: disclosure.popularityScore },
    { event: eDigweed,     venueCapacity: vZouk.capacity,   ticketsSold: 180,  artistPopularity: digweed.popularityScore    },
    { event: eHartono,     venueCapacity: vHall.capacity,   ticketsSold: 1760, artistPopularity: hartono.popularityScore    },
    { event: eSamWillows,  venueCapacity: vHall.capacity,   ticketsSold: 720,  artistPopularity: samWillows.popularityScore },
    { event: eFestival,    venueCapacity: vArena.capacity,  ticketsSold: 1250, artistPopularity: disclosure.popularityScore },
    { event: eSubsonic,    venueCapacity: vLounge.capacity, ticketsSold: 188,  artistPopularity: subsonic.popularityScore   },
  ];

  let forecastCount = 0;
  for (const { event, venueCapacity, ticketsSold, artistPopularity } of forecastInputs) {
    const daysUntilEvent = Math.max(0, Math.floor((new Date(event.startTime) - Date.now()) / 86_400_000));
    try {
      const aiData = await forecaster.predictDemand({ eventId: event.id, venueCapacity, ticketsSold, daysUntilEvent, artistPopularity });
      const predictedSelloutDate = new Date(Date.now() + aiData.predicted_days_to_sell_out * 24 * 60 * 60 * 1000);
      await prisma.demandForecast.create({
        data: { eventId: event.id, predictedSelloutDate, confidenceScore: aiData.confidence_score, modelVersion: aiData.model_version },
      });
      console.log(`  ↳ ${event.title.padEnd(42)} confidence=${aiData.confidence_score.toFixed(2)}  sellout in ${aiData.predicted_days_to_sell_out}d`);
      forecastCount++;
    } catch (err) {
      console.warn(`  ⚠️  AI forecast skipped for "${event.title}": ${err.message}`);
    }
  }
  console.log(`✅  Demand forecasts created (${forecastCount}/${forecastInputs.length} from AI service)\n`);

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉  Seed complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Admin         admin@admin.com            / admin');
  console.log('  Organizer 1   organizer@zouk.com         / Password1!');
  console.log('  Organizer 2   organizer@esplanade.com    / Password1!');
  console.log('  Organizer 3   organizer@suntec.com       / Password1!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Event                          Sold / Cap    AI Confidence (see output above)');
  console.log('  Disclosure: Live at Zouk        680 / 800');
  console.log('  Sasha & John Digweed: Classics  180 / 800');
  console.log('  Nathan Hartono: One Night Only 1760 / 1800');
  console.log('  The Sam Willows: Encore Tour    720 / 1800');
  console.log('  Singapore Music Festival       1250 / 5000');
  console.log('  Subsonic Eye: Album Launch      188 / 200   ← 165 already checked in');
  console.log('  NYE Countdown 2027                0 / 800    DRAFT');
  console.log('  Pop Showcase                      0 / 5000   CANCELLED');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main().catch(console.error).finally(() => prisma.$disconnect());
