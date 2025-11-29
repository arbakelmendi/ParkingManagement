// backend/routes/reservationRoutes.js
const express = require("express");
const router = express.Router();
const controller = require("../controllers/reservationController");

router.get("/", controller.getAllReservations);
router.get("/:id", controller.getReservation);
router.post("/", controller.createReservation);
router.put("/:id", controller.updateReservation);
router.delete("/:id", controller.deleteReservation);

module.exports = router;
