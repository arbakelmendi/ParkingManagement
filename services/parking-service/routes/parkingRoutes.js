const express = require("express");
const router = express.Router();
const controller = require("../controllers/parkingController");
const { requireAuth, requireRole } = require("../middleware/auth");

router.get("/", controller.getAllParkings);
router.get("/:id/spots", controller.getParkingSpots);
router.get("/:id", controller.getParking);



router.post("/", requireAuth, requireRole("admin"), controller.createParking);
router.put("/:id", requireAuth, requireRole("admin"), controller.updateParking);
router.delete("/:id", requireAuth, requireRole("admin"), controller.deleteParking);

module.exports = router;