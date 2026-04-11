const express = require('express');
const router = express.Router();
const { processWebhook } = require('../controllers/paymentController');

router.post('/webhook', processWebhook);

module.exports = router;
