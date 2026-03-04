const express = require('express');
const cors = require('cors');
const prisma = require('./lib/prisma');

const app = express();

// Middleware
app.use(cors());
app.use(express.json()); // Allows us to read JSON data

// -----------------------------------------
// HEALTH CHECK ROUTE
// -----------------------------------------
app.get('/health', (req, res) => {
  res.json({ status: "ok", message: "Eventia Backend is running!" });
});

// -----------------------------------------
// TEST ROUTE: Create a Tenant & Event
// -----------------------------------------
app.get('/test-seed', async (req, res) => {
  try {
    // 1. Create a fake Tenant
    const tenant = await prisma.tenant.create({
      data: {
        name: "Sony Music",
      }
    });

    // 2. Create a Venue for that Tenant
    const venue = await prisma.venue.create({
      data: {
        name: "Madison Square Garden",
        capacity: 20000,
        tenantId: tenant.id
      }
    });

    res.json({ message: "Seed successful!", tenant, venue });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

// -----------------------------------------
// CREATE EVENT ROUTE
// -----------------------------------------
app.post('/api/events', async (req, res) => {
  try {
    const { title, date, venueId, tenantId } = req.body;

    const newEvent = await prisma.event.create({
      data: {
        title: title,
        startTime: new Date(date),
        venueId: venueId,
        tenantId: tenantId,
        status: 'DRAFT'
      }
    });

    res.status(201).json({ message: "Event created successfully!", event: newEvent });
  } catch (error) {
    console.error("Error creating event:", error);
    res.status(500).json({ error: "Failed to create event" });
  }
});

// -----------------------------------------
// GET EVENTS (For Dashboard)
// -----------------------------------------
app.get('/api/events', async (req, res) => {
  try {
    const tenantId = req.query.tenantId; 

    const events = await prisma.event.findMany({
      where: { 
        tenantId: tenantId 
      },
      include: { 
        venue: true,       
        forecast: true,
        _count: {
          select: { tickets: true }  
        }
      },
      orderBy: { 
        startTime: 'asc' 
      }
    });

    res.json(events);
  } catch (error) {
    console.error("Error fetching events:", error);
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

// -----------------------------------------
// GENERATE AI FORECAST
// -----------------------------------------
const axios = require('axios'); // Add this at the top of your file if it isn't there!

app.post('/api/events/:id/forecast', async (req, res) => {
  try {
    const eventId = req.params.id;
    
    // 1. Fetch the Event & Venue capacity
    const event = await prisma.event.findUnique({ 
      where: { id: eventId }, 
      include: { venue: true } 
    });
    
    if (!event) return res.status(404).json({ error: "Event not found" });

    // 2. Call the Python AI Microservice
    const aiResponse = await axios.post('http://127.0.0.1:8000/predict', {
      event_id: event.id,
      venue_capacity: event.venue?.capacity || 10000
    });

    const aiData = aiResponse.data;

    // 3. Save the prediction to PostgreSQL using an Upsert (Update or Create)
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
});

// -----------------------------------------
// PURCHASE TICKET ROUTE
// -----------------------------------------
app.post('/api/tickets/purchase', async (req, res) => {
  try {
    const { eventId, customerEmail, tenantId } = req.body;

    // 1. FETCH EVENT DETAILS FIRST
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        venue: true, // We need the venue capacity
        _count: { select: { tickets: true } } // We need the current ticket count
      }
    });

    if (!event) return res.status(404).json({ error: "Event not found" });

    // 2. CHECK CAPACITY (THE BUSINESS LOGIC!)
    if (event._count.tickets >= event.venue.capacity) {
      return res.status(400).json({ error: "SOLD_OUT", message: "Sorry, this event is sold out!" });
    }

    // 3. PROCEED WITH PURCHASE
    const ticket = await prisma.ticket.create({
      data: {
        qrCode: `QR-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
        event: { connect: { id: eventId } },
        order: {
          create: {
            totalAmount: 0,
            paymentStatus: 'PAID',
            user: {
              connectOrCreate: {
                where: { email: customerEmail },
                create: {
                  email: customerEmail,
                  passwordHash: "dummy_hash",
                  tenant: { connect: { id: tenantId } }
                }
              }
            }
          }
        }
      }
    });

    res.status(201).json({ message: "Purchase successful!", ticket });
  } catch (error) {
    console.error("Purchase Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/tenants/:id', async (req, res) => {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.params.id }
    });
    res.json(tenant);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch tenant" });
  }
});

// Start Server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});