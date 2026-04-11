const express = require('express');
const router = express.Router();
const { getEventStats, createEvent, generateForecast } = require('../controllers/eventController');

router.get('/', getEventStats);
router.post('/', createEvent);
router.post('/:id/forecast', generateForecast);

module.exports = router;
