const express = require('express');
const router = express.Router();
const { getVenues } = require('../controllers/venueController');

// Anyone can read venues (global resource)
router.get('/', getVenues);

// Venue creation moved to /api/admin/venues (ADMIN only)

module.exports = router;
