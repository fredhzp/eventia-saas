const prisma = require('../lib/prisma');
const eventService = require('../services/eventService');
const TimeSeriesAI = require('../services/forecast/TimeSeriesAI');

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
    res.status(201).json({ message: "Event created successfully!", event: newEvent });
  } catch (error) {
    if (error.message === 'INVALID_DATE') {
      return res.status(400).json({ error: "Please provide a valid date and time." });
    }
    console.error("Error creating event:", error);
    res.status(500).json({ error: "Failed to create event" });
  }
};

const generateForecast = async (req, res) => {
  try {
    const event = await prisma.event.findUnique({
      where: { id: req.params.id },
      include: { venue: true }
    });

    if (!event) return res.status(404).json({ error: "Event not found" });

    const forecaster = new TimeSeriesAI();
    const aiData = await forecaster.predictDemand({
      eventId: event.id,
      venueCapacity: event.venue?.capacity
    });

    const futureDate = new Date(Date.now() + aiData.predicted_days_to_sell_out * 24 * 60 * 60 * 1000);

    const forecast = await prisma.demandForecast.upsert({
      where: { eventId: event.id },
      update: {
        confidenceScore: aiData.confidence_score,
        modelVersion: aiData.model_version,
        predictedSelloutDate: futureDate
      },
      create: {
        eventId: event.id,
        confidenceScore: aiData.confidence_score,
        modelVersion: aiData.model_version,
        predictedSelloutDate: futureDate
      }
    });

    res.json(forecast);
  } catch (error) {
    console.error("AI Service Error:", error.message);
    res.status(500).json({ error: "Failed to generate forecast" });
  }
};

module.exports = { getEventStats, createEvent, generateForecast };
