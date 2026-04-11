const express = require('express');
const router = express.Router();
const { getTenant } = require('../controllers/tenantController');

router.get('/:id', getTenant);

module.exports = router;
