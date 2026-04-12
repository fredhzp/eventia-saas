const express = require('express');
const router = express.Router();
const { purchaseTicket, getTicketsByEmail, checkinTicket } = require('../controllers/ticketController');

router.get('/', getTicketsByEmail);
router.post('/purchase', purchaseTicket);
router.post('/checkin', checkinTicket);

module.exports = router;
