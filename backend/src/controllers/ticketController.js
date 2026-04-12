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

    const ticket = await prisma.ticket.create({
      data: {
        qrCode: `QR-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
        event: { connect: { id: eventId } },
        order: {
          create: {
            totalAmount: 0,
            paymentStatus: 'PAID',
            user: {
              connectOrCreate: {
                where: { email: customerEmail },
                create: {
                  email: customerEmail,
                  passwordHash: "dummy_hash",
                  tenant: { connect: { id: tenantId } }
                }
              }
            }
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

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        orders: {
          include: {
            tickets: {
              include: {
                event: {
                  include: { venue: true }
                }
              }
            }
          }
        }
      }
    });

    if (!user) return res.json([]);

    const tickets = user.orders.flatMap(order =>
      order.tickets.map(ticket => ({
        id: ticket.id,
        qrCode: ticket.qrCode,
        checkedInAt: ticket.checkedInAt,
        event: {
          id: ticket.event.id,
          title: ticket.event.title,
          startTime: ticket.event.startTime,
          venue: ticket.event.venue?.name ?? 'Unknown venue',
        },
      }))
    );

    res.json(tickets);
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
        order: { include: { user: true } },
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
        order: { include: { user: true } },
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
        buyerEmail: updated.order.user.email,
      },
    });
  } catch (error) {
    console.error('checkinTicket Error:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = { purchaseTicket, getTicketsByEmail, checkinTicket };
