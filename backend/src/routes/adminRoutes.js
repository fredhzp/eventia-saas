const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const {
  getAllTenants, updateTenant,
  getAllVenues, createVenue, updateVenue, deleteVenue,
  getAllEvents, updateEvent
} = require('../controllers/adminController');

// All admin routes require a valid JWT + ADMIN role
router.use(authMiddleware, adminMiddleware);

// Tenants
router.get('/tenants',        getAllTenants);
router.put('/tenants/:id',    updateTenant);

// Venues
router.get('/venues',         getAllVenues);
router.post('/venues',        createVenue);
router.put('/venues/:id',     updateVenue);
router.delete('/venues/:id',  deleteVenue);

// Events
router.get('/events',         getAllEvents);
router.put('/events/:id',     updateEvent);

module.exports = router;
