// backend/routes/spotRoutes.js
const express = require("express");
const router = express.Router();
const controller = require("../controllers/spotController");

router.get("/", controller.getAllSpots);
router.get("/:id", controller.getSpot);
router.post("/", controller.createSpot);
router.put("/:id", controller.updateSpot);
router.delete("/:id", controller.deleteSpot);

module.exports = router;
