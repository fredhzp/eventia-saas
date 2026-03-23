const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const prisma = require('../lib/prisma');
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_for_dev";

// 1. REGISTER A NEW USER
const register = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    // 1. Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: "Email already in use." });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    let assignedTenantId = null;

    // 2. NEW LOGIC: If they are an Organizer, create their "Company" (Tenant) first
    if (role === "ORGANIZER") {
      const newTenant = await prisma.tenant.create({
        data: {
          name: `${email.split('@')[0]}'s Organization`, // Default name
        }
      });
      assignedTenantId = newTenant.id;
    }

    // 3. Create the user and link them to the new Tenant
    const newUser = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: role || "USER",
        tenantId: assignedTenantId // This is now a real UUID, not null
      }
    });

    // 4. Generate token with the NEW tenantId included
    const token = jwt.sign(
      { userId: newUser.id, role: newUser.role, tenantId: newUser.tenantId },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.status(201).json({ message: "Registration successful", token });
  } catch (error) {
    console.error("Registration Error:", error);
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