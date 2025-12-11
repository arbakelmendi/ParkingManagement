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
    const { parkingId, spotId, userId, startTime, endTime } = req.body;

    // 1) kontrollim spot-in
    const spot = await Spot.getById(spotId);
    if (!spot)
      return res.status(404).json({ message: "Parking spot not found" });

    // nese nga tabela e spot-eve nuk vjen parkingId, perdor parkingId nga req.body
    const effectiveParkingId = spot.ParkingId || parkingId;

    // 2) kontrollim kapacitetin
    const parking = await Parking.getById(effectiveParkingId);
    if (!parking)
      return res.status(404).json({ message: "Parking not found" });

    if (parking.Occupied >= parking.Capacity) {
      return res
        .status(400)
        .json({ message: "No free spots available in this parking" });
    }

    if (spot.IsOccupied) {
      return res
        .status(400)
        .json({ message: "This parking spot is already occupied" });
    }

    // 3) krijimi i rezervimit
    const created = await Reservation.create({
      parkingId: effectiveParkingId,
      spotId,
      userId,
      startTime,
      endTime,
    });

    // 4) update logjikes se parkingut & spot-it
    await Parking.incrementOccupied(effectiveParkingId);
    await Spot.setOccupied(spotId, true);

    // 5) dergimi i eventeve ne Kafka
    const eventPayload = {
      type: "ReservationCreated",
      reservationId: created.Id,
      parkingId: effectiveParkingId,
      spotId,
      userId,
      startTime,
      endTime,
      timestamp: new Date().toISOString(),
    };

    try {
      await producer.send({
        topic: "parking-events",
        messages: [{ value: JSON.stringify(eventPayload) }],
      });
      console.log("Kafka ReservationCreated:", eventPayload);
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
    if (!existing)
      return res.status(404).json({ message: "Reservation not found" });

    const updated = await Reservation.update(req.params.id, req.body);

    const eventPayload = {
      type: "ReservationUpdated",
      reservationId: updated.Id || req.params.id,
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
    if (!existing)
      return res.status(404).json({ message: "Reservation not found" });

    const { ParkingId, SpotId } = existing;

    // 1) fshirja e rezervimit
    const ok = await Reservation.delete(req.params.id);
    if (!ok) return res.status(500).json({ message: "Error deleting reservation" });

    // 2) ul Occupied dhe liro spot-in
    if (ParkingId) {
      await Parking.decrementOccupied(ParkingId);
    }
    if (SpotId) {
      await Spot.setOccupied(SpotId, false);
    }

    // 3) event Kafka
    const eventPayload = {
      type: "ReservationDeleted",
      reservationId: req.params.id,
      parkingId: ParkingId,
      spotId: SpotId,
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
