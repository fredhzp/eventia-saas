const express = require('express');
const router = express.Router();
const { getEventStats, createEvent, generateForecast, getPublicEvents, updateEventStatus } = require('../controllers/eventController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/public', getPublicEvents);
router.get('/', getEventStats);
router.post('/', authMiddleware, createEvent);
router.post('/:id/forecast', authMiddleware, generateForecast);
router.patch('/:id/status', authMiddleware, updateEventStatus);

module.exports = router;
