const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "2h" }
  );
}

// POST /api/auth/register
async function register(req, res) {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "name, email, password are required" });
    }

    const existing = await User.findByEmail(email);
    if (existing) {
      return res.status(409).json({ message: "Email already in use" });
    }

    // ✅ role: lejo vetëm "user" nga klienti (mos lejo admin nga register)
    const safeRole = "user";

    const passwordHash = await bcrypt.hash(password, 10);

    const created = await User.create({
      name,
      email,
      password: passwordHash,
      role: safeRole,
    });

    const token = signToken(created);

    return res.status(201).json({
      user: created,
      token,
    });
  } catch (err) {
    console.error("register error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

// POST /api/auth/login
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required" });
    }

    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = signToken(user);

    return res.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      token,
    });
  } catch (err) {
    console.error("login error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}
//const bcrypt = require("bcrypt");
//const jwt = require("jsonwebtoken");
//const User = require("../models/userModel");

async function register(req, res) {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "name, email dhe password janë të detyrueshme." });
    }

    // kontrollo nese ekziston
    const existing = await User.getByEmail(email);
    if (existing) {
      return res.status(409).json({ message: "Ky email është në përdorim." });
    }

    // hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // krijo user me role default = user
    const created = await User.create({
      name,
      email,
      password: passwordHash,
      role: "user",
    });

    // token (opsionale: e logon direkt)
    const token = jwt.sign(
      { id: created.id, email: created.email, role: created.role },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    return res.status(201).json({
      message: "Registered successfully",
      token,
      user: { id: created.id, name: created.name, email: created.email, role: created.role },
    });
  } catch (err) {
    console.error("register error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "email dhe password janë të detyrueshme." });
    }

    const user = await User.findByEmail(email);
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    return res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error("login error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

module.exports = { register, login };

// GET /api/auth/me
async function me(req, res) {
  // req.user vjen nga middleware
  return res.json({ user: req.user });
}

module.exports = { register, login, me };