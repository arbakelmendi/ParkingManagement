const express = require("express");
const router = express.Router();
const controller = require("../controllers/spotController");
const { requireAuth, requireRole } = require("../middleware/auth");

// public read
router.get("/", controller.getAllSpots);
router.get("/:id", controller.getSpot);

// admin write
router.post("/", requireAuth, requireRole("admin"), controller.createSpot);
router.put("/:id", requireAuth, requireRole("admin"), controller.updateSpot);
router.delete("/:id", requireAuth, requireRole("admin"), controller.deleteSpot);

module.exports = router;