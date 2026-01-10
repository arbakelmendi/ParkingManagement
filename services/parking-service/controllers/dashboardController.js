const { pool, poolConnect } = require("../config/db");

// GET /api/dashboard/stats
async function getDashboardStats(req, res) {
  try {
    console.log("[dashboard] GET /api/dashboard/stats", { userId: req.user?.id, role: req.user?.role });
    await poolConnect;
    const result = await pool.request().query(`
      SELECT
        (SELECT COUNT(*) FROM Parkings) AS totalParkings,
        (SELECT COUNT(*) FROM ParkingSpots) AS totalSpots,
        (SELECT COUNT(*) FROM ParkingSpots WHERE status = 'free') AS freeSpots,
        (SELECT COUNT(*) FROM ParkingSpots WHERE status = 'occupied') AS occupiedSpots,
        (SELECT COUNT(*) FROM reservations) AS totalReservations,
        (SELECT COUNT(*) FROM reservations WHERE start_time <= GETDATE() AND end_time >= GETDATE()) AS activeReservations,
        (SELECT COUNT(*) FROM reservations WHERE CAST(start_time AS DATE) = CAST(GETDATE() AS DATE)) AS reservationsToday
    `);

    return res.json(result.recordset[0] || {
      totalParkings: 0,
      totalSpots: 0,
      freeSpots: 0,
      occupiedSpots: 0,
      totalReservations: 0,
      activeReservations: 0,
      reservationsToday: 0,
    });
  } catch (err) {
    console.error("getDashboardStats error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

module.exports = { getDashboardStats };
