// backend/controllers/parkingController.js
const Parking = require("../models/parkingModel");

// GET /api/parkings
async function getAllParkings(req, res) {
  try {
    const data = await Parking.getAll();
    res.json(data);
  } catch (err) {
    console.error("getAllParkings error:", err);
    res.status(500).json({ error: "Server Error" });
  }
}

// GET /api/parkings/:id
async function getParking(req, res) {
  try {
    const data = await Parking.getById(req.params.id);
    if (!data) return res.status(404).json({ message: "Not Found" });
    res.json(data);
  } catch (err) {
    console.error("getParking error:", err);
    res.status(500).json({ error: "Server Error" });
  }
}

// POST /api/parkings
async function createParking(req, res) {
  try {
    const created = await Parking.create(req.body);
    res.status(201).json(created);
  } catch (err) {
    console.error("createParking error:", err);
    res.status(500).json({ error: "Error creating parking" });
  }
}

// PUT /api/parkings/:id
async function updateParking(req, res) {
  try {
    const updated = await Parking.update(req.params.id, req.body);
    if (!updated) return res.status(404).json({ message: "Not Found" });
    res.json(updated);
  } catch (err) {
    console.error("updateParking error:", err);
    res.status(500).json({ error: "Error updating parking" });
  }
}

// DELETE /api/parkings/:id
async function deleteParking(req, res) {
  try {
    await Parking.delete(req.params.id);
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    console.error("deleteParking error:", err);
    res.status(500).json({ error: "Error deleting parking" });
  }
}

module.exports = {
  getAllParkings,
  getParking,
  createParking,
  updateParking,
  deleteParking,
};
