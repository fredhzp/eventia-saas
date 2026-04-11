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

module.exports = { purchaseTicket };
