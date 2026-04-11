const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const userRepository = require('../repositories/userRepository');

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_for_dev";

const verifyCredentials = async (email, password) => {
  const user = await userRepository.findByEmail(email);
  if (!user) throw new Error('INVALID_CREDENTIALS');

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) throw new Error('INVALID_CREDENTIALS');

  return user;
};

const generateJWT = (user) => {
  return jwt.sign(
    { userId: user.id, role: user.role, tenantId: user.tenantId },
    JWT_SECRET,
    { expiresIn: '1d' }
  );
};

const registerUser = async (email, password, role) => {
  const existing = await userRepository.findByEmail(email);
  if (existing) throw new Error('EMAIL_IN_USE');

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  let tenantId = null;
  if (role === 'ORGANIZER') {
    const tenant = await prisma.tenant.create({
      data: { name: `${email.split('@')[0]}'s Organization` }
    });
    tenantId = tenant.id;
  }

  return userRepository.save({
    email,
    passwordHash,
    role: role || 'USER',
    tenantId
  });
};

module.exports = { verifyCredentials, generateJWT, registerUser };
