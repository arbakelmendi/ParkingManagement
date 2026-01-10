const bcrypt = require("bcrypt");
const User = require("../models/userModel");

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

function normalizeRole(role) {
  const r = String(role || "").toLowerCase().trim();
  return r || "user";
}

async function getUsers(req, res) {
  try {
    console.log("[users] GET /api/users", { userId: req.user?.id, role: req.user?.role });
    const users = await User.getAll();
    return res.json(users);
  } catch (err) {
    console.error("getUsers error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

async function createUser(req, res) {
  try {
    console.log("[users] POST /api/users", { userId: req.user?.id, role: req.user?.role });
    const { name, email, password, role } = req.body || {};
    const finalRole = normalizeRole(role);

    if (!name || !email || !password) {
      return res.status(400).json({ message: "name, email, password are required" });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }
    if (!["user", "admin"].includes(finalRole)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const existing = await User.findByEmail(email);
    if (existing) {
      return res.status(409).json({ message: "Email already in use" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const created = await User.create({
      name,
      email,
      password_hash: passwordHash,
      role: finalRole,
    });

    return res.status(201).json(created);
  } catch (err) {
    console.error("createUser error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

async function updateUser(req, res) {
  try {
    console.log("[users] PUT /api/users/:id", { userId: req.user?.id, role: req.user?.role, id: req.params.id });
    const id = Number(req.params.id);
    if (!id || Number.isNaN(id)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const { name, email, password, role } = req.body || {};
    const finalRole = normalizeRole(role);

    if (!name || !email || !role) {
      return res.status(400).json({ message: "name, email, role are required" });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }
    if (!["user", "admin"].includes(finalRole)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const existingUser = await User.getById(id);
    if (!existingUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const emailOwner = await User.findByEmail(email);
    if (emailOwner && Number(emailOwner.id) !== id) {
      return res.status(409).json({ message: "Email already in use" });
    }

    const updateData = { name, email, role: finalRole };
    if (typeof password === "string" && password.length > 0) {
      updateData.password_hash = await bcrypt.hash(password, 10);
    }

    const updated = await User.update(id, updateData);
    return res.json(updated);
  } catch (err) {
    console.error("updateUser error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

async function deleteUser(req, res) {
  try {
    console.log("[users] DELETE /api/users/:id", { userId: req.user?.id, role: req.user?.role, id: req.params.id });
    const id = Number(req.params.id);
    if (!id || Number.isNaN(id)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const existingUser = await User.getById(id);
    if (!existingUser) {
      return res.status(404).json({ message: "User not found" });
    }

    await User.delete(id);
    return res.json({ ok: true });
  } catch (err) {
    console.error("deleteUser error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

module.exports = {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
};
