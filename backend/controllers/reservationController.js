// backend/controllers/reservationController.js
const Reservation = require("../models/reservationModel");

// GET /api/reservations
async function getAllReservations(req, res) {
  try {
    const data = await Reservation.getAll();
    res.json(data);
  } catch (err) {
    console.error("getAllReservations error:", err);
    res.status(500).json({ error: "Server Error" });
  }
}

// GET /api/reservations/:id
async function getReservation(req, res) {
  try {
    const data = await Reservation.getById(req.params.id);
    if (!data) return res.status(404).json({ message: "Reservation not found" });
    res.json(data);
  } catch (err) {
    console.error("getReservation error:", err);
    res.status(500).json({ error: "Server Error" });
  }
}

// POST /api/reservations
async function createReservation(req, res) {
  try {
    const created = await Reservation.create(req.body);
    res.status(201).json(created);
  } catch (err) {
    console.error("createReservation error:", err);
    // këto janë më shumë gabime të logjikës së biznesit, jo error serveri
    res.status(400).json({ error: err.message });
  }
}

// PUT /api/reservations/:id
async function updateReservation(req, res) {
  try {
    const updated = await Reservation.update(req.params.id, req.body);
    if (!updated) return res.status(404).json({ message: "Reservation not found" });
    res.json(updated);
  } catch (err) {
    console.error("updateReservation error:", err);
    res.status(400).json({ error: err.message });
  }
}

// DELETE /api/reservations/:id
async function deleteReservation(req, res) {
  try {
    const ok = await Reservation.delete(req.params.id);
    if (!ok) return res.status(404).json({ message: "Reservation not found" });
    res.json({ message: "Reservation deleted and spot freed." });
  } catch (err) {
    console.error("deleteReservation error:", err);
    res.status(500).json({ error: "Error deleting reservation" });
  }
}

module.exports = {
  getAllReservations,
  getReservation,
  createReservation,
  updateReservation,
  deleteReservation,
};
