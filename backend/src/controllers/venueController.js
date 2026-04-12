const prisma = require('../lib/prisma');

const getVenues = async (req, res) => {
  try {
    const venues = await prisma.venue.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(venues);
  } catch (error) {
    console.error("Error fetching venues:", error);
    res.status(500).json({ error: "Failed to fetch venues" });
  }
};

const createVenue = async (req, res) => {
  try {
    const { name, capacity } = req.body;

    const newVenue = await prisma.venue.create({
      data: {
        name,
        capacity: parseInt(capacity),
      }
    });

    res.status(201).json(newVenue);
  } catch (error) {
    console.error("Error creating venue:", error);
    res.status(500).json({ error: "Failed to create venue" });
  }
};

module.exports = { getVenues, createVenue };
