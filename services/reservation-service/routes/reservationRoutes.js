// services/reservation-service/routes/reservationRoutes.js


const express = require("express");
const router = express.Router();

const controller = require("../controllers/reservationController");
const { requireAuth, requireRole } = require("../middleware/auth");

// user: i sheh veç të vetat
router.get("/", requireAuth, controller.getMyReservations);

// admin: i sheh krejt
router.get("/all", requireAuth, requireRole("admin"), controller.getAllReservations);

// create (user ose admin)
router.post("/", requireAuth, controller.createReservation);

// delete (admin or owner)
router.delete("/:id", requireAuth, controller.deleteReservation);

module.exports = router;
