const prisma = require('../lib/prisma');
const eventRepository = require('../repositories/eventRepository');

const publishEvent = async (dto) => {
  const { title, date, venueId, tenantId } = dto;

  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) {
    throw new Error('INVALID_DATE');
  }

  return eventRepository.save({
    title,
    startTime: parsedDate,
    venueId,
    tenantId,
    status: 'DRAFT'
  });
};

const checkAvailability = async (eventId) => {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      venue: true,
      _count: { select: { tickets: true } }
    }
  });

  if (!event) throw new Error('EVENT_NOT_FOUND');

  return {
    available: event._count.tickets < event.venue.capacity,
    remaining: event.venue.capacity - event._count.tickets,
    event
  };
};

module.exports = { publishEvent, checkAvailability };
