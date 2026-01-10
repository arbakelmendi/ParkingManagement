const { pool, poolConnect } = require("../config/db");

// GET /api/admin/stats
async function getAdminStats(req, res) {
  try {
    await poolConnect;
    const result = await pool.request().query(`
      SELECT
        (SELECT COUNT(*) FROM Parkings) AS totalParkings,
        (SELECT COUNT(*) FROM ParkingSpots) AS totalSpots,
        (SELECT COUNT(*) FROM ParkingSpots WHERE status = 'free') AS freeSpots,
        (SELECT COUNT(*) FROM ParkingSpots WHERE status = 'occupied') AS occupiedSpots
    `);

    res.json(result.recordset[0] || {
      totalParkings: 0,
      totalSpots: 0,
      freeSpots: 0,
      occupiedSpots: 0
    });
  } catch (err) {
    console.error("getAdminStats error:", err);
    res.status(500).json({ error: "Server Error" });
  }
}

module.exports = { getAdminStats };
