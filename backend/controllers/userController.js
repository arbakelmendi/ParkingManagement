// backend/controllers/userController.js
const User = require("../models/userModel");
const bcrypt = require("bcrypt");

// GET /api/users (admin)
async function getAllUsers(req, res) {
  try {
    const users = await User.getAll();
    res.json(users);
  } catch (err) {
    console.error("getAllUsers error:", err);
    res.status(500).json({ error: "Server Error" });
  }
}

// GET /api/users/:id (admin)
async function getUser(req, res) {
  try {
    const user = await User.getById(req.params.id);
    if (!user) return res.status(404).json({ message: "Not Found" });
    res.json(user);
  } catch (err) {
    console.error("getUser error:", err);
    res.status(500).json({ error: "Server Error" });
  }
}

// PUT /api/users/:id (admin)
// nëse password vjen, e hash-on
async function updateUser(req, res) {
  try {
    const payload = { ...req.body };

    if (payload.password) {
      payload.password = await bcrypt.hash(payload.password, 10);
    } else {
      // duhet me marrë hash-in ekzistues nëse s’po e ndërron (për thjeshtësi: mos lejo update pa password)
      // por më mirë: kërko user-in e vjetër dhe ruaje password-in e vjetër
      const existing = await User.findByEmail(payload.email); // jo ideal
    }

    // ✅ Nëse s’po dërgon password, mos e preke fare: e bëjmë pak më mirë:
    // marrim user-in aktual dhe e përdorim password-in e vjetër
    const current = await User.findByEmail(payload.email);
    if (!payload.password && current?.password) {
      payload.password = current.password;
    }

    const updated = await User.update(req.params.id, payload);
    if (!updated) return res.status(404).json({ message: "Not Found" });
    res.json(updated);
  } catch (err) {
    console.error("updateUser error:", err);
    res.status(500).json({ error: "Error updating user" });
  }
}

// DELETE /api/users/:id (admin)
async function deleteUser(req, res) {
  try {
    await User.delete(req.params.id);
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    console.error("deleteUser error:", err);
    res.status(500).json({ error: "Error deleting user" });
  }
}

module.exports = {
  getAllUsers,
  getUser,
  updateUser,
  deleteUser,
};