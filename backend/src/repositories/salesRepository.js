const prisma = require('../lib/prisma');

const getDailySales = async (eventId) => {
  return prisma.ticket.findMany({
    where: { eventId },
    include: { order: true }
  });
};

module.exports = { getDailySales };
