const prisma = require('../lib/prisma');
const eventService = require('../services/eventService');
const TimeSeriesAI = require('../services/forecast/TimeSeriesAI');

// ── Shared helper — runs the AI forecast and persists it ────────────────────
const runForecastForEvent = async (eventId) => {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      venue: true,
      _count: { select: { tickets: true } },
      artists: { include: { artist: true } }
    }
  });

  if (!event) return;

  const ticketsSold      = event._count.tickets;
  const daysUntilEvent   = Math.max(0, Math.floor((new Date(event.startTime) - Date.now()) / 86_400_000));
  const artistPopularity = event.artists.length > 0
    ? Math.max(...event.artists.map(a => a.artist.popularityScore))
    : 50;

  const forecaster = new TimeSeriesAI();
  const aiData = await forecaster.predictDemand({
    eventId:          event.id,
    venueCapacity:    event.venue?.capacity,
    ticketsSold,
    daysUntilEvent,
    artistPopularity,
  });

  const rawSelloutDate = new Date(Date.now() + aiData.predicted_days_to_sell_out * 24 * 60 * 60 * 1000);
  // If the model predicts sellout after the event starts, it won't sell out in time — store null.
  const predictedSelloutDate = rawSelloutDate < new Date(event.startTime) ? rawSelloutDate : null;

  await prisma.demandForecast.upsert({
    where:  { eventId: event.id },
    update: { confidenceScore: aiData.confidence_score, modelVersion: aiData.model_version, predictedSelloutDate },
    create: { eventId: event.id, confidenceScore: aiData.confidence_score, modelVersion: aiData.model_version, predictedSelloutDate }
  });
};

// ── Controllers ─────────────────────────────────────────────────────────────

const getEventStats = async (req, res) => {
  try {
    const { tenantId } = req.query;

    const events = await prisma.event.findMany({
      where: { tenantId },
      include: {
        venue: true,
        forecast: true,
        _count: { select: { tickets: true } }
      },
      orderBy: { startTime: 'asc' }
    });

    res.json(events);
  } catch (error) {
    console.error("Error fetching events:", error);
    res.status(500).json({ error: "Failed to fetch events" });
  }
};

const createEvent = async (req, res) => {
  try {
    const newEvent = await eventService.publishEvent(req.body);

    // Respond immediately — don't make the organiser wait for the AI
    res.status(201).json({ message: "Event created successfully!", event: newEvent });

    // Fire forecast asynchronously after the response is sent
    setImmediate(() => {
      runForecastForEvent(newEvent.id).catch(err =>
        console.error(`Background forecast failed for event ${newEvent.id}:`, err.message)
      );
    });
  } catch (error) {
    if (error.message === 'INVALID_DATE') {
      return res.status(400).json({ error: "Please provide a valid date and time." });
    }
    console.error("Error creating event:", error);
    res.status(500).json({ error: "Failed to create event" });
  }
};

// Manual refresh endpoint — still useful for re-running after ticket sales
const generateForecast = async (req, res) => {
  try {
    await runForecastForEvent(req.params.id);

    const forecast = await prisma.demandForecast.findUnique({
      where: { eventId: req.params.id }
    });

    if (!forecast) return res.status(404).json({ error: "Event not found" });

    res.json(forecast);
  } catch (error) {
    console.error("AI Service Error:", error.message);
    res.status(500).json({ error: "Failed to generate forecast" });
  }
};

const updateEventStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const { tenantId } = req.user;

    if (!['DRAFT', 'PUBLISHED', 'CANCELLED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) return res.status(404).json({ error: 'Event not found' });
    if (event.tenantId !== tenantId) return res.status(403).json({ error: 'Forbidden' });

    const updated = await prisma.event.update({
      where: { id },
      data: { status },
      include: { venue: true, forecast: true, _count: { select: { tickets: true } } }
    });

    res.json(updated);
  } catch (error) {
    console.error('Error updating event status:', error);
    res.status(500).json({ error: 'Failed to update event status' });
  }
};

const getPublicEvents = async (req, res) => {
  try {
    const events = await prisma.event.findMany({
      where: { status: 'PUBLISHED' },
      include: {
        venue: true,
        tenant: { select: { name: true } },
        forecast: true,
        _count: { select: { tickets: true } }
      },
      orderBy: { startTime: 'asc' }
    });
    res.json(events);
  } catch (error) {
    console.error("Error fetching public events:", error);
    res.status(500).json({ error: "Failed to fetch events" });
  }
};

const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { tenantId } = req.user;

    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) return res.status(404).json({ error: 'Event not found' });
    if (event.tenantId !== tenantId) return res.status(403).json({ error: 'Forbidden' });
    if (event.status === 'PUBLISHED') return res.status(400).json({ error: 'PUBLISHED_EVENT' });

    await prisma.event.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
};

module.exports = { getEventStats, createEvent, generateForecast, getPublicEvents, updateEventStatus, deleteEvent };
