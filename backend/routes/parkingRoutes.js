const express = require("express");
const router = express.Router();
const controller = require("../controllers/parkingController");

router.get("/", controller.getAllParkings);
router.get("/:id", controller.getParking);
router.post("/", controller.createParking);
router.put("/:id", controller.updateParking);
router.delete("/:id", controller.deleteParking);

module.exports = router;
