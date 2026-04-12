const prisma = require('../lib/prisma');

// ── Tenants ──────────────────────────────────────────────────────────────────

const getAllTenants = async (req, res) => {
  try {
    const tenants = await prisma.tenant.findMany({
      include: { _count: { select: { users: true, events: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(tenants);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tenants' });
  }
};

const updateTenant = async (req, res) => {
  try {
    const { name, subscriptionStatus } = req.body;
    const tenant = await prisma.tenant.update({
      where: { id: req.params.id },
      data: { name, subscriptionStatus }
    });
    res.json(tenant);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update tenant' });
  }
};

// ── Venues ───────────────────────────────────────────────────────────────────

const getAllVenues = async (req, res) => {
  try {
    const venues = await prisma.venue.findMany({
      include: { _count: { select: { events: true } } },
      orderBy: { name: 'asc' }
    });
    res.json(venues);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch venues' });
  }
};

const createVenue = async (req, res) => {
  try {
    const { name, capacity, geoLat, geoLong } = req.body;
    const venue = await prisma.venue.create({
      data: { name, capacity: parseInt(capacity), geoLat: geoLat ? parseFloat(geoLat) : null, geoLong: geoLong ? parseFloat(geoLong) : null }
    });
    res.status(201).json(venue);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create venue' });
  }
};

const updateVenue = async (req, res) => {
  try {
    const { name, capacity, geoLat, geoLong } = req.body;
    const venue = await prisma.venue.update({
      where: { id: req.params.id },
      data: { name, capacity: parseInt(capacity), geoLat: geoLat ? parseFloat(geoLat) : null, geoLong: geoLong ? parseFloat(geoLong) : null }
    });
    res.json(venue);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update venue' });
  }
};

const deleteVenue = async (req, res) => {
  try {
    await prisma.venue.delete({ where: { id: req.params.id } });
    res.json({ message: 'Venue deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete venue — it may have associated events' });
  }
};

// ── Events ───────────────────────────────────────────────────────────────────

const getAllEvents = async (req, res) => {
  try {
    const events = await prisma.event.findMany({
      include: {
        venue: true,
        tenant: { select: { name: true } },
        forecast: true,
        _count: { select: { tickets: true } }
      },
      orderBy: { startTime: 'desc' }
    });
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch events' });
  }
};

const updateEvent = async (req, res) => {
  try {
    const { title, startTime, status } = req.body;
    const event = await prisma.event.update({
      where: { id: req.params.id },
      data: { title, startTime: new Date(startTime), status }
    });
    res.json(event);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update event' });
  }
};

module.exports = { getAllTenants, updateTenant, getAllVenues, createVenue, updateVenue, deleteVenue, getAllEvents, updateEvent };
