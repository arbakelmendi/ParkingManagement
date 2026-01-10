const { pool, poolConnect } = require("../config/db");

// GET /api/admin/stats
async function getAdminStats(req, res, next) {
  try {
    await poolConnect;
    const result = await pool.request().query(`
      SELECT
        (SELECT COUNT(*) FROM reservations) AS totalReservations,
        (SELECT COUNT(*) FROM reservations WHERE start_time <= GETDATE() AND end_time >= GETDATE()) AS activeReservations,
        (SELECT COUNT(*) FROM reservations WHERE CAST(start_time AS DATE) = CAST(GETDATE() AS DATE)) AS reservationsToday
    `);

    res.json(result.recordset[0] || {
      totalReservations: 0,
      activeReservations: 0,
      reservationsToday: 0
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getAdminStats };
