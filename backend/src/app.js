const express = require('express');
const cors = require('cors');

const authRoutes    = require('./routes/authRoutes');
const eventRoutes   = require('./routes/eventRoutes');
const venueRoutes   = require('./routes/venueRoutes');
const ticketRoutes  = require('./routes/ticketRoutes');
const tenantRoutes  = require('./routes/tenantRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const adminRoutes   = require('./routes/adminRoutes');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth',     authRoutes);
app.use('/api/events',   eventRoutes);
app.use('/api/venues',   venueRoutes);
app.use('/api/tickets',  ticketRoutes);
app.use('/api/tenants',  tenantRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin',    adminRoutes);

app.get('/health', (_, res) => res.json({ status: 'ok' }));

module.exports = app;
