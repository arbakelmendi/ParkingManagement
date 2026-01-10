const bcrypt = require("bcrypt");
const User = require("../models/userModel");

const allowedRoles = new Set(["admin", "user"]);

const normalizeUser = (user) => {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    created_at: user.created_at,
  };
};

async function listUsers(req, res) {
  try {
    const q = String(req.query.q || "").trim();
    const users = await User.getAll(q || undefined);
    return res.json({ users: users.map(normalizeUser) });
  } catch (err) {
    console.error("listUsers error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

async function getUser(req, res) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid id" });
    const user = await User.getById(id);
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.json({ user: normalizeUser(user) });
  } catch (err) {
    console.error("getUser error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

async function createUser(req, res) {
  try {
    const { name, email, password, role } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ message: "name, email, password are required" });
    }
    const roleValue = String(role || "user").toLowerCase();
    if (!allowedRoles.has(roleValue)) {
      return res.status(400).json({ message: "Invalid role" });
    }
    const existing = await User.findByEmail(email);
    if (existing) return res.status(409).json({ message: "Email already in use" });

    const passwordHash = await bcrypt.hash(String(password), 10);
    const created = await User.create({
      name,
      email,
      password_hash: passwordHash,
      role: roleValue,
    });
    return res.status(201).json({ user: normalizeUser(created) });
  } catch (err) {
    console.error("createUser error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

async function updateUser(req, res) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid id" });
    const { name, email, role } = req.body || {};
    if (!name || !email || !role) {
      return res.status(400).json({ message: "name, email, role are required" });
    }
    const roleValue = String(role).toLowerCase();
    if (!allowedRoles.has(roleValue)) {
      return res.status(400).json({ message: "Invalid role" });
    }
    const updated = await User.update(id, { name, email, role: roleValue });
    if (!updated) return res.status(404).json({ message: "User not found" });
    return res.json({ user: normalizeUser(updated) });
  } catch (err) {
    console.error("updateUser error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

async function deleteUser(req, res) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid id" });
    await User.delete(id);
    return res.status(204).send();
  } catch (err) {
    console.error("deleteUser error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

async function updatePassword(req, res) {
  try {
    const id = Number(req.params.id);
    const { password } = req.body || {};
    if (!id) return res.status(400).json({ message: "Invalid id" });
    if (!password) return res.status(400).json({ message: "password is required" });
    const passwordHash = await bcrypt.hash(String(password), 10);
    const updated = await User.update(id, { password_hash: passwordHash });
    if (!updated) return res.status(404).json({ message: "User not found" });
    return res.json({ ok: true });
  } catch (err) {
    console.error("updatePassword error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

module.exports = {
  listUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  updatePassword,
};
