// /controllers/parkingController.js
const Parking = require("../models/parkingModel");
//const { producer } = require("../config/kafka"); //KAFKA

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

async function createParking(req, res) {
  try {
    const created = await Parking.create({
      name: req.body.name,
      location: req.body.location,
      capacity: req.body.capacity,
      occupied: req.body.occupied || 0,
    });

    const eventPayload = {
      type: "ParkingCreated",
      parkingId: created.Id,
      name: created.Name,
      location: created.Location,
      capacity: created.Capacity,
      timestamp: new Date().toISOString(),
    };

    try {
      await producer.send({
        topic: "parking-events",
        messages: [{ value: JSON.stringify(eventPayload) }],
      });
      console.log("Kafka ParkingCreated:", eventPayload);
    } catch (err) {
      console.error("Kafka error:", err);
    }

    res.status(201).json(created);
  } catch (err) {
    console.error("createParking error:", err);
    res.status(500).json({ error: "Error creating parking" });
  }
}


async function updateParking(req, res) {
  try {
    const updated = await Parking.update(req.params.id, req.body);
    if (!updated) return res.status(404).json({ message: "Not Found" });

    const eventPayload = {
      type: "ParkingUpdated",
      parkingId: updated.Id,
      data: updated,
      timestamp: new Date().toISOString(),
    };

    try {
      await producer.send({
        topic: "parking-events",
        messages: [{ value: JSON.stringify(eventPayload) }],
      });
    } catch (err) {
      console.error("Kafka error:", err);
    }

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

    //Eventet per delete
    const eventPayload = {
      type: "ParkingDeleted",
      parkingId: req.params.id,
      timestamp: new Date().toISOString(),
    };

    try {
      await producer.send({
        topic: "parking-events",
        messages: [{ value: JSON.stringify(eventPayload) }],
      });
      console.log("Kafka ParkingDeleted:", eventPayload);
    } catch (kafkaErr) {
      console.error("Kafka error (ParkingDeleted):", kafkaErr);
    }

    res.json({ message: "Deleted successfully" });
  } catch (err) {
    console.error("deleteParking error:", err);
    res.status(500).json({ error: "Error deleting parking" });
  }
}

// GET /api/parkings/:id/spots
async function getParkingSpots(req, res) {
  try {
    const Spot = require("../models/spotModel");
    const spots = await Spot.getByParkingId(req.params.id);
    res.json(spots);
  } catch (err) {
    console.error("getParkingSpots error:", err);
    res.status(500).json({ error: "Server Error" });
  }
}

module.exports = {
  getAllParkings,
  getParking,
  createParking,
  updateParking,
  deleteParking,
  getParkingSpots,
};