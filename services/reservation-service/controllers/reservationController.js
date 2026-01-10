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

async function createReservation(req, res, next) {
  try {
    const body = req.body || {};

    const data = {
      user_id: Number(req.user.id),
      spot_id: Number(body.spot_id ?? body.spotId ?? body.SpotId),
      start_time: body.start_time ?? body.startTime ?? body.StartTime,
      end_time: body.end_time ?? body.endTime ?? body.EndTime,
    };

    const created = await Reservation.create(data);
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
}


async function deleteReservation(req, res, next) {
  try {
    const id = Number(req.params.id);
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
};
