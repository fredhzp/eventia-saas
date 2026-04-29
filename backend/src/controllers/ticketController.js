const crypto = require('crypto');
const prisma = require('../lib/prisma');

const purchaseTicket = async (req, res) => {
  try {
    const { eventId, customerEmail, tenantId } = req.body;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        venue: true,
        _count: { select: { tickets: true } }
      }
    });

    if (!event) return res.status(404).json({ error: "Event not found" });

    if (event._count.tickets >= event.venue.capacity) {
      return res.status(400).json({ error: "SOLD_OUT", message: "Sorry, this event is sold out!" });
    }

    // DESIGN NOTE (post-supervisor-review revision):
    // Buyer authentication is intentionally out of scope for this MVP.
    // The platform targets event organisers; buyers are identified by
    // email only and retrieve their tickets via the /my-tickets lookup.
    // Buyer email is stored directly on the Order entity rather than
    // creating placeholder User rows. If buyer accounts are added later,
    // introduce a proper registration flow and migrate existing orders
    // by their buyerEmail.
    const ticket = await prisma.ticket.create({
      data: {
        qrCode: `QR-${crypto.randomUUID()}`,
        event: { connect: { id: eventId } },
        order: {
          create: {
            totalAmount: 0,
            paymentStatus: 'PAID',
            buyerEmail: customerEmail,
          }
        }
      }
    });

    res.status(201).json({ message: "Purchase successful!", ticket });
  } catch (error) {
    console.error("Purchase Error:", error);
    res.status(500).json({ error: error.message });
  }
};

const getTicketsByEmail = async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: 'email is required' });

    const tickets = await prisma.ticket.findMany({
      where: { order: { buyerEmail: email } },
      include: {
        event: { include: { venue: true } },
      },
    });

    const result = tickets.map(ticket => ({
      id: ticket.id,
      qrCode: ticket.qrCode,
      checkedInAt: ticket.checkedInAt,
      event: {
        id: ticket.event.id,
        title: ticket.event.title,
        startTime: ticket.event.startTime,
        venue: ticket.event.venue?.name ?? 'Unknown venue',
      },
    }));

    res.json(result);
  } catch (error) {
    console.error('getTicketsByEmail Error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * POST /api/tickets/checkin
 * Body: { qrCode: string }
 *
 * Marks a ticket as checked in. Isolated into its own function so the
 * caller (route + frontend) can be swapped for a camera-scan trigger
 * without touching this logic.
 */
const checkinTicket = async (req, res) => {
  try {
    const { qrCode } = req.body;
    if (!qrCode) return res.status(400).json({ error: 'qrCode is required' });

    const ticket = await prisma.ticket.findUnique({
      where: { qrCode },
      include: {
        event: { include: { venue: true } },
        order: true,
      },
    });

    if (!ticket) return res.status(404).json({ error: 'TICKET_NOT_FOUND' });
    if (ticket.checkedInAt) {
      return res.status(409).json({
        error: 'ALREADY_CHECKED_IN',
        checkedInAt: ticket.checkedInAt,
      });
    }

    const updated = await prisma.ticket.update({
      where: { qrCode },
      data: { checkedInAt: new Date() },
      include: {
        event: { include: { venue: true } },
        order: true,
      },
    });

    res.json({
      message: 'Check-in successful',
      ticket: {
        id: updated.id,
        qrCode: updated.qrCode,
        checkedInAt: updated.checkedInAt,
        event: {
          title: updated.event.title,
          startTime: updated.event.startTime,
          venue: updated.event.venue?.name ?? 'Unknown venue',
        },
        buyerEmail: updated.order.buyerEmail,
      },
    });
  } catch (error) {
    console.error('checkinTicket Error:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = { purchaseTicket, getTicketsByEmail, checkinTicket };
