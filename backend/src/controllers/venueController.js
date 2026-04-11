const prisma = require('../lib/prisma');

const getVenues = async (req, res) => {
  try {
    const { tenantId } = req.query;

    if (!tenantId) {
      return res.status(400).json({ error: "tenantId is required to fetch venues" });
    }

    const venues = await prisma.venue.findMany({
      where: { tenantId }
    });

    res.json(venues);
  } catch (error) {
    console.error("Error fetching venues:", error);
    res.status(500).json({ error: "Failed to fetch venues" });
  }
};

const createVenue = async (req, res) => {
  try {
    const { name, capacity, tenantId } = req.body;

    const newVenue = await prisma.venue.create({
      data: {
        name,
        capacity: parseInt(capacity),
        tenant: { connect: { id: tenantId } }
      }
    });

    res.status(201).json(newVenue);
  } catch (error) {
    console.error("Error creating venue:", error);
    res.status(500).json({ error: "Failed to create venue" });
  }
};

module.exports = { getVenues, createVenue };
