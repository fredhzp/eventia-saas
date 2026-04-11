const express = require('express');
const router = express.Router();
const { purchaseTicket } = require('../controllers/ticketController');

router.post('/purchase', purchaseTicket);

module.exports = router;
