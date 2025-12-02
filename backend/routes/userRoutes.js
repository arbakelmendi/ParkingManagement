// backend/routes/userRoutes.js
const express = require("express");
const router = express.Router();
const controller = require("../controllers/userController");

router.get("/", controller.getAllUsers);
router.get("/:id", controller.getUser);
router.post("/", controller.createUser);
router.put("/:id", controller.updateUser);
router.delete("/:id", controller.deleteUser);

module.exports = router;
