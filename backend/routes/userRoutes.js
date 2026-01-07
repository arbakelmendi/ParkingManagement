// backend/routes/userRoutes.js
const express = require("express");
const router = express.Router();
const controller = require("../controllers/userController");
const { requireAuth, requireRole } = require("../middleware/auth");

router.get("/", requireAuth, requireRole("admin"), controller.getAllUsers);
router.get("/:id", requireAuth, requireRole("admin"), controller.getUser);
router.put("/:id", requireAuth, requireRole("admin"), controller.updateUser);
router.delete("/:id", requireAuth, requireRole("admin"), controller.deleteUser);

module.exports = router;

