const authService = require('../services/authService');

const register = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    const newUser = await authService.registerUser(email, password, role);
    const token = authService.generateJWT(newUser);

    res.status(201).json({ message: "Registration successful", token });
  } catch (error) {
    if (error.message === 'EMAIL_IN_USE') {
      return res.status(400).json({ error: "Email already in use." });
    }
    console.error("Registration Error:", error);
    res.status(500).json({ error: "Server error during registration" });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await authService.verifyCredentials(email, password);
    const token = authService.generateJWT(user);

    res.json({ message: "Login successful", token, role: user.role, tenantId: user.tenantId });
  } catch (error) {
    if (error.message === 'INVALID_CREDENTIALS') {
      return res.status(401).json({ error: "Invalid credentials." });
    }
    console.error("Login Error:", error);
    res.status(500).json({ error: "Server error during login" });
  }
};

module.exports = { register, login };
