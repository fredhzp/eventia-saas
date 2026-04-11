const prisma = require('../lib/prisma');

const findByEmail = async (email) => {
  return prisma.user.findUnique({ where: { email } });
};

const save = async (data) => {
  return prisma.user.create({ data });
};

module.exports = { findByEmail, save };
