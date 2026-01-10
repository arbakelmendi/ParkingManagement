// services/reservation-service/routes/reservationRoutes.js


const express = require("express");
const router = express.Router();

const controller = require("../controllers/reservationController");
const { requireAuth, requireRole } = require("../middleware/auth");

// user: i sheh veç të vetat
router.get("/my", requireAuth, controller.getMyReservations);

// admin: i sheh krejt
router.get("/", requireAuth, requireRole("admin"), controller.getAllReservations);

// legacy admin list
router.get("/all", requireAuth, requireRole("admin"), controller.getAllReservations);

// admin stats (nën /api/reservations)
router.get("/admin/stats", requireAuth, requireRole("admin"), require("../controllers/adminController").getAdminStats);

// create (user ose admin)
router.post("/", requireAuth, controller.createReservation);

// delete (admin or owner)
router.delete("/:id", requireAuth, controller.deleteReservation);

module.exports = router;
