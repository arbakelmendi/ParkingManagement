// services/reservation-service/controllers/reservationController.js


const Reservation = require("../models/reservationModel");

function getStatusFromError(err) {
  const message = err?.message || "";
  if (!message) return 500;
  if (message.includes("të detyrueshme") || message.includes("Format") || message.includes("start_time")) {
    return 400;
  }
  if (message.includes("rezervuar") || message.includes("reserved") || message.includes("zënë")) {
    return 409;
  }
  if (message.includes("nuk ekziston") || message.includes("not found")) {
    return 404;
  }
  return 500;
}

async function getMyReservations(req, res, next) {
  try {
    console.log("[reservations] GET /api/reservations/my", { userId: req.user?.id, role: req.user?.role });
    const userId = Number(req.user.id);
    const mine = await Reservation.getByUser(userId);
    res.json(mine);
  } catch (err) {
    next(err);
  }
}


async function getAllReservations(req, res, next) {
  try {
    console.log("[reservations] GET /api/reservations", { userId: req.user?.id, role: req.user?.role });
    const reservations = await Reservation.getAll();
    res.json(reservations);
  } catch (err) {
    next(err);
  }
}

async function createReservation(req, res, next) {
  try {
    console.log("[reservations] POST /api/reservations", { userId: req.user?.id, role: req.user?.role });
    const body = req.body || {};

    const data = {
      user_id: Number(req.user.id),
      spot_id: Number(body.spot_id ?? body.spotId ?? body.SpotId),
      start_time: body.start_time ?? body.startTime ?? body.StartTime,
      end_time: body.end_time ?? body.endTime ?? body.EndTime,
    };

    if (!data.spot_id || Number.isNaN(data.spot_id)) {
      return res.status(400).json({ message: "spot_id is required" });
    }
    if (!data.start_time || !data.end_time) {
      return res.status(400).json({ message: "start_time and end_time are required" });
    }

    const start = new Date(data.start_time);
    const end = new Date(data.end_time);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return res.status(400).json({ message: "Invalid start_time or end_time" });
    }

    const hasOverlap = await Reservation.hasOverlap(
      data.spot_id,
      data.start_time,
      data.end_time
    );

    if (hasOverlap) {
      return res.status(409).json({ message: "Spot already reserved for that time range" });
    }

    const created = await Reservation.create(data);
    res.status(201).json(created);
  } catch (err) {
    const status = getStatusFromError(err);
    if (status !== 500) {
      return res.status(status).json({ message: err.message });
    }
    return next(err);
  }
}


async function deleteReservation(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!id || Number.isNaN(id)) {
      return res.status(400).json({ message: "Invalid reservation id" });
    }
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
    const status = getStatusFromError(err);
    if (status !== 500) {
      return res.status(status).json({ message: err.message });
    }
    return next(err);
  }
}

module.exports = {
  getMyReservations,
  getAllReservations,
  createReservation,
  deleteReservation,
};
