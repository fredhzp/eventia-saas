const express = require('express');
const router = express.Router();
const { getEventStats, createEvent, generateForecast, getPublicEvents, updateEventStatus, deleteEvent } = require('../controllers/eventController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/public', getPublicEvents);
router.get('/', getEventStats);
router.post('/', authMiddleware, createEvent);
router.post('/:id/forecast', authMiddleware, generateForecast);
router.patch('/:id/status', authMiddleware, updateEventStatus);
router.delete('/:id', authMiddleware, deleteEvent);

module.exports = router;
