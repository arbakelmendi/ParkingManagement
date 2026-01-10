const express = require("express");
const router = express.Router();
const controller = require("../controllers/dashboardController");
const { requireAuth, requireRole } = require("../middleware/auth");

router.get("/stats", requireAuth, requireRole("admin"), controller.getDashboardStats);

module.exports = router;
