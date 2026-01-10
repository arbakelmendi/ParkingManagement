// services/reservation-service/controllers/reservationController.js


const Reservation = require("../models/reservationModel");

async function getMyReservations(req, res, next) {
  try {
    const userId = Number(req.user.id);
    const mine = await Reservation.getByUser(userId);
    res.json(mine);
  } catch (err) {
    next(err);
  }
}


async function getAllReservations(req, res, next) {
  try {
    const reservations = await Reservation.getAll();
    res.json(reservations);
  } catch (err) {
    next(err);
  }
}

const isConflictError = (message) => {
  const text = String(message || "").toLowerCase();
  return (
    text.includes("already reserved") ||
    text.includes("rezervuar") ||
    text.includes("rezervimi") ||
    text.includes("zënë") ||
    text.includes("occupied")
  );
};

const isValidationError = (message) => {
  const text = String(message || "").toLowerCase();
  return (
    text.includes("required") ||
    text.includes("detyrueshme") ||
    text.includes("format") ||
    text.includes("vlefshëm") ||
    text.includes("start_time") ||
    text.includes("end_time") ||
    text.includes("positive") ||
    text.includes("jetë")
  );
};

async function createReservation(req, res, next) {
  const body = req.body || {};
  const userId = Number(req.user?.id);
  const spotId = Number(body.spot_id ?? body.spotId ?? body.SpotId);
  const startTimeRaw = body.start_time ?? body.startTime ?? body.StartTime;
  const endTimeRaw = body.end_time ?? body.endTime ?? body.EndTime;

  console.info("createReservation hit", { userId, spotId });
  console.info("createReservation body", body);

  if (!userId || !Number.isFinite(userId)) {
    return res.status(400).json({ error: "user_id is required" });
  }
  if (!spotId || !Number.isFinite(spotId)) {
    return res.status(400).json({ error: "spot_id is required" });
  }
  if (!startTimeRaw || !endTimeRaw) {
    return res.status(400).json({ error: "start_time and end_time are required" });
  }

  const startTime = new Date(startTimeRaw);
  const endTime = new Date(endTimeRaw);

  if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
    return res.status(400).json({ error: "Invalid start_time or end_time" });
  }
  const now = new Date();
  if (startTime < now) {
    return res.status(400).json({
      code: "RESERVATION_IN_PAST",
      message: "Cannot create a reservation in the past.",
    });
  }
  if (startTime >= endTime) {
    return res.status(400).json({
      code: "INVALID_TIME_RANGE",
      message: "End time must be after start time.",
    });
  }

  try {
    const hasOverlap = await Reservation.hasOverlap(spotId, startTime, endTime);
    if (hasOverlap) {
      return res.status(409).json({
        code: "RESERVATION_CONFLICT",
        message: "Spot already reserved for that time range",
      });
    }

    const created = await Reservation.create({
      user_id: userId,
      spot_id: spotId,
      start_time: startTime,
      end_time: endTime,
    });
    res.status(201).json(created);
  } catch (err) {
    if (isConflictError(err?.message)) {
      return res.status(409).json({
        code: "RESERVATION_CONFLICT",
        message: "Spot already reserved for that time range",
      });
    }
    if (isValidationError(err?.message)) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
}

async function getAvailability(req, res, next) {
  try {
    const startRaw = req.query.start;
    const endRaw = req.query.end;
    const parkingIdRaw = req.query.parkingId;

    console.info("availability hit", { start: startRaw, end: endRaw, parkingId: parkingIdRaw });

    if (!startRaw || !endRaw) {
      return res.status(400).json({ error: "start and end are required" });
    }

    const start = new Date(String(startRaw));
    const end = new Date(String(endRaw));
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ error: "Invalid start or end" });
    }

    const parkingId = parkingIdRaw ? Number(parkingIdRaw) : undefined;
    if (parkingIdRaw && (!Number.isFinite(parkingId) || parkingId <= 0)) {
      return res.status(400).json({ error: "parkingId must be a positive number" });
    }

    const reservedSpotIds = await Reservation.getReservedSpotIds(start, end, parkingId);
    res.json({ reservedSpotIds });
  } catch (err) {
    next(err);
  }
}


async function deleteReservation(req, res, next) {
  try {
    const id = Number(req.params.id);
    const reservation = await Reservation.getById(id);

    if (!reservation) {
      return res.status(404).json({ message: "Reservation not found" });
    }

    const isAdmin = req.user?.role === "admin";
    const isOwner = Number(reservation.user_id) === Number(req.user?.id);

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const ok = await Reservation.delete(id);

    if (!ok) {
      return res.status(404).json({ message: "Reservation not found" });
    }

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getMyReservations,
  getAllReservations,
  createReservation,
  deleteReservation,
  getAvailability,
};
