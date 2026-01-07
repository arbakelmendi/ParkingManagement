// backend/controllers/reservationController.js
const Reservation = require("../models/reservationModel");
const Parking = require("../models/parkingModel");
const Spot = require("../models/spotModel");
const { producer } = require("../config/kafka");

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
    // ✅ user_id merret nga token
    const user_id = req.user.id;

    // ✅ vijnë nga body (snake_case)
    const { parkingId, spot_id, start_time, end_time } = req.body;

    // ✅ validim minimal (mos e kërko user_id nga body)
    if (!spot_id || !start_time || !end_time) {
      return res.status(400).json({
        message: "Të gjitha fushat (spot_id, start_time, end_time) janë të detyrueshme.",
      });
    }

    // 1) kontrollo spot-in
    const spot = await Spot.getById(spot_id);
    if (!spot) return res.status(404).json({ message: "Parking spot not found" });

    // parkingId efektiv
    const effectiveParkingId = spot.ParkingId || parkingId || null;

    // 2) kontrollo statusin e spot-it
    if (spot.status !== "free") {
      return res.status(400).json({ message: "This parking spot is already occupied" });
    }

    // 3) krijo rezervimin ✅ DUHET me ia dërgu user_id modelit
    const created = await Reservation.create({
      user_id,
      spot_id,
      start_time,
      end_time,
    });

    // 4) update parking + spot
    if (effectiveParkingId) {
      await Parking.incrementOccupied(effectiveParkingId);
    }
    await Spot.setStatus(spot_id, "occupied");

    // 5) Kafka event (opsionale)
    const eventPayload = {
      type: "ReservationCreated",
      reservationId: created.id || created.Id,
      parkingId: effectiveParkingId,
      spotId: spot_id,
      userId: user_id,
      startTime: start_time,
      endTime: end_time,
      timestamp: new Date().toISOString(),
    };

    try {
      await producer.send({
        topic: "parking-events",
        messages: [{ value: JSON.stringify(eventPayload) }],
      });
    } catch (kafkaErr) {
      console.error("Kafka error (ReservationCreated):", kafkaErr);
    }

    res.status(201).json(created);
  } catch (err) {
    console.error("createReservation error:", err);
    res.status(400).json({ error: err.message });
  }
}

// PUT /api/reservations/:id
async function updateReservation(req, res) {
  try {
    const existing = await Reservation.getById(req.params.id);
    if (!existing) return res.status(404).json({ message: "Reservation not found" });

    const updated = await Reservation.update(req.params.id, req.body);

    const eventPayload = {
      type: "ReservationUpdated",
      reservationId: updated.id || updated.Id || req.params.id,
      data: updated,
      timestamp: new Date().toISOString(),
    };

    try {
      await producer.send({
        topic: "parking-events",
        messages: [{ value: JSON.stringify(eventPayload) }],
      });
      console.log("Kafka ReservationUpdated:", eventPayload);
    } catch (kafkaErr) {
      console.error("Kafka error (ReservationUpdated):", kafkaErr);
    }

    res.json(updated);
  } catch (err) {
    console.error("updateReservation error:", err);
    res.status(400).json({ error: err.message });
  }
}

// DELETE /api/reservations/:id
async function deleteReservation(req, res) {
  try {
    const existing = await Reservation.getById(req.params.id);
    if (!existing) return res.status(404).json({ message: "Reservation not found" });

    // ⚠️ ekzistuesi (existing) nga query yt ka r.id, r.user_id, r.spot_id...
    const spotId = existing.spot_id || existing.SpotId;
    const parkingId = existing.parking_id || existing.ParkingId || null;

    const ok = await Reservation.delete(req.params.id);
    if (!ok) return res.status(500).json({ message: "Error deleting reservation" });

    // liro spot-in (vetëm status)
    if (spotId) {
      await Spot.setStatus(spotId, "free");
    }

    // ul Occupied në parking (nëse e keni)
    if (parkingId) {
      await Parking.decrementOccupied(parkingId);
    }

    // Kafka event
    const eventPayload = {
      type: "ReservationDeleted",
      reservationId: req.params.id,
      parkingId: parkingId,
      spotId: spotId,
      timestamp: new Date().toISOString(),
    };

    try {
      await producer.send({
        topic: "parking-events",
        messages: [{ value: JSON.stringify(eventPayload) }],
      });
      console.log("Kafka ReservationDeleted:", eventPayload);
    } catch (kafkaErr) {
      console.error("Kafka error (ReservationDeleted):", kafkaErr);
    }

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
