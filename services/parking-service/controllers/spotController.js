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


const normalizeStatus = (body) => {
  const rawStatus = body?.status ?? body?.Status;
  const rawAvailable = body?.IsAvailable ?? body?.isAvailable ?? body?.available;

  if (rawStatus !== undefined && rawStatus !== null) {
    const normalized = String(rawStatus).toLowerCase().trim();
    if (normalized === "available" || normalized === "free") return "free";
    if (normalized === "occupied") return "occupied";
    return null;
  }

  if (rawAvailable !== undefined && rawAvailable !== null) {
    return rawAvailable ? "free" : "occupied";
  }

  return undefined;
};

const normalizeUpdatePayload = (body) => {
  const spotNumber =
    body?.spot_number ?? body?.SpotNumber ?? body?.spotNumber ?? undefined;
  const parkingId =
    body?.ParkingId ?? body?.parkingId ?? body?.parking_id ?? undefined;
  const status = normalizeStatus(body);

  const payload = {};

  if (spotNumber !== undefined) {
    const spotNumberValue = Number(spotNumber);
    if (!Number.isFinite(spotNumberValue) || spotNumberValue <= 0) {
      return { error: "spot_number must be a positive number" };
    }
    payload.spot_number = spotNumberValue;
  }

  if (parkingId !== undefined) {
    const parkingIdValue = Number(parkingId);
    if (!Number.isFinite(parkingIdValue) || parkingIdValue <= 0) {
      return { error: "ParkingId must be a positive number" };
    }
    payload.ParkingId = parkingIdValue;
  }

  if (status === null) {
    return { error: "status must be 'available'/'free' or 'occupied'" };
  }
  if (status !== undefined) {
    payload.status = status;
  }

  if (!payload.spot_number && !payload.ParkingId && !payload.status) {
    return { error: "No valid fields to update" };
  }

  return { payload };
};

async function updateSpot(req, res) {
  const spotId = req.params.id;
  console.info("updateSpot hit", { spotId, user: req.user || null });
  console.info("updateSpot body", req.body);

  const normalized = normalizeUpdatePayload(req.body);
  if (normalized.error) {
    return res.status(400).json({ error: normalized.error });
  }

  try {
    let updated = null;
    if (normalized.payload.status && !normalized.payload.spot_number && !normalized.payload.ParkingId) {
      updated = await Spot.setStatus(spotId, normalized.payload.status);
    } else {
      updated = await Spot.update(spotId, normalized.payload);
    }
    if (!updated) return res.status(404).json({ message: "Not Found" });
    res.json(updated);
  } catch (err) {
    console.error("updateSpot error:", err?.message || err);
    console.error("updateSpot stack:", err?.stack || "no stack");
    console.error("updateSpot body:", req.body);
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
