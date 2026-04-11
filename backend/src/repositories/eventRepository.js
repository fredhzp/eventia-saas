const prisma = require('../lib/prisma');

const findWithTenants = async (id) => {
  return prisma.event.findUnique({
    where: { id },
    include: { venue: true, forecast: true, tenant: true }
  });
};

const save = async (data) => {
  return prisma.event.create({ data });
};

module.exports = { findWithTenants, save };
