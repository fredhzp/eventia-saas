const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const prisma = require('../lib/prisma');
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_for_dev";

// 1. REGISTER A NEW USER
const register = async (req, res) => {
  try {
    const { email, password, role, tenantId } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: "Email already in use." });
    }

    // Hash the password securely
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create the user in the database
    const newUser = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: role || "USER", // Default to regular buyer
        tenantId: tenantId || null // Link to an organizer workspace if provided
      }
    });

    // Generate a JWT Token
    const token = jwt.sign(
      { userId: newUser.id, role: newUser.role, tenantId: newUser.tenantId },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.status(201).json({ message: "Registration successful", token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error during registration" });
  }
};

// 2. LOGIN AN EXISTING USER
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find the user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    // Compare the provided password with the hashed password in the DB
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    // Generate a JWT Token
    const token = jwt.sign(
      { userId: user.id, role: user.role, tenantId: user.tenantId },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({ message: "Login successful", token, role: user.role, tenantId: user.tenantId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error during login" });
  }
};

module.exports = { register, login };