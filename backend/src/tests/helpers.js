const request  = require('supertest');
const app      = require('../app');
const prisma   = require('../lib/prisma');
const jwt      = require('jsonwebtoken');

const agent = request(app);

/** Delete all rows in FK-safe order to give each test file a clean slate. */
const clearTestDb = async () => {
  await prisma.ticket.deleteMany();
  await prisma.order.deleteMany();
  await prisma.demandForecast.deleteMany();
  await prisma.event.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenant.deleteMany();
  await prisma.venue.deleteMany();
};

/** Register a new user and return the raw response. */
const register = (email, password = 'Test1234!', role = 'ORGANIZER') =>
  agent.post('/api/auth/register').send({ email, password, role });

/** Log in and return just the JWT string. */
const loginToken = async (email, password = 'Test1234!') => {
  const res = await agent.post('/api/auth/login').send({ email, password });
  return res.body.token;
};

/** Build an Authorization header object from a JWT string. */
const bearer = (token) => ({ Authorization: `Bearer ${token}` });

/** Decode a JWT without verifying (for reading claims in tests). */
const decode = (token) => jwt.decode(token);

module.exports = { agent, prisma, clearTestDb, register, loginToken, bearer, decode };
