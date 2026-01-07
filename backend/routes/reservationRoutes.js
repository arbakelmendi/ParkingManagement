const express = require("express");
const router = express.Router();
const controller = require("../controllers/reservationController");
const { requireAuth } = require("../middleware/auth");

router.get("/", requireAuth, controller.getAllReservations);
router.get("/:id", requireAuth, controller.getReservation);
router.post("/", requireAuth, controller.createReservation);
router.put("/:id", requireAuth, controller.updateReservation);
router.delete("/:id", requireAuth, controller.deleteReservation);

module.exports = router;