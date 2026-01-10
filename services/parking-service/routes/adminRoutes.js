const express = require("express");
const router = express.Router();
const controller = require("../controllers/adminController");
const { requireAuth, requireRole } = require("../middleware/auth");

router.get("/stats", requireAuth, requireRole("admin"), controller.getAdminStats);

module.exports = router;
