// backend/controllers/userController.js
const User = require("../models/userModel");

// GET /api/users
async function getAllUsers(req, res) {
  try {
    const users = await User.getAll();
    res.json(users);
  } catch (err) {
    console.error("getAllUsers error:", err);
    res.status(500).json({ error: "Server Error" });
  }
}

// GET /api/users/:id
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

// POST /api/users
async function createUser(req, res) {
  try {
    const created = await User.create(req.body);
    res.status(201).json(created);
  } catch (err) {
    console.error("createUser error:", err);
    res.status(500).json({ error: "Error creating user" });
  }
}

// PUT /api/users/:id
async function updateUser(req, res) {
  try {
    const updated = await User.update(req.params.id, req.body);
    if (!updated) return res.status(404).json({ message: "Not Found" });
    res.json(updated);
  } catch (err) {
    console.error("updateUser error:", err);
    res.status(500).json({ error: "Error updating user" });
  }
}

// DELETE /api/users/:id
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
  createUser,
  updateUser,
  deleteUser,
};
