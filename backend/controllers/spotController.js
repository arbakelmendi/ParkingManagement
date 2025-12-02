// backend/controllers/spotController.js
const Spot = require("../models/spotModel");

async function getAllSpots(req, res) {
  try {
    const spots = await Spot.getAll();
    res.json(spots);
  } catch (err) {
    console.error("getAllSpots error:", err);
    res.status(500).json({ error: "Server Error" });
  }
}

async function getSpot(req, res) {
  try {
    const spot = await Spot.getById(req.params.id);
    if (!spot) return res.status(404).json({ message: "Not Found" });
    res.json(spot);
  } catch (err) {
    console.error("getSpot error:", err);
    res.status(500).json({ error: "Server Error" });
  }
}

async function createSpot(req, res) {
  try {
    const created = await Spot.create(req.body);
    res.status(201).json(created);
  } catch (err) {
    console.error("createSpot error:", err);
    res.status(500).json({ error: "Error creating spot" });
  }
}

async function updateSpot(req, res) {
  try {
    const updated = await Spot.update(req.params.id, req.body);
    if (!updated) return res.status(404).json({ message: "Not Found" });
    res.json(updated);
  } catch (err) {
    console.error("updateSpot error:", err);
    res.status(500).json({ error: "Error updating spot" });
  }
}

async function deleteSpot(req, res) {
  try {
    await Spot.delete(req.params.id);
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    console.error("deleteSpot error:", err);
    res.status(500).json({ error: "Error deleting spot" });
  }
}

module.exports = {
  getAllSpots,
  getSpot,
  createSpot,
  updateSpot,
  deleteSpot,
};
