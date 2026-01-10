require("dotenv").config({ path: ".env" });
const { pool, poolConnect } = require("./config/db");

async function run() {
    try {
        await poolConnect;
        console.log("Connected to DB");

        // Check columns of ParkingSpots
        const result = await pool.request().query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'ParkingSpots'
    `);
        console.log("ParkingSpots columns:", result.recordset.map(r => r.COLUMN_NAME));

        // Try the getByUser query
        const userId = 1; // Assume user 1 exists or doesn't, query should run just return empty
        const query = `
      SELECT r.id, r.user_id, r.spot_id,
             ps.spot_number,
             ps.ParkingId,
             r.start_time, r.end_time
      FROM reservations r
      JOIN ParkingSpots ps ON ps.id = r.spot_id
      WHERE r.user_id = 1
      ORDER BY r.id DESC
    `;
        console.log("Running query...");
        await pool.request().query(query);
        console.log("Query success!");

    } catch (err) {
        console.error("DEBUG ERROR:", err);
    } finally {
        process.exit();
    }
}

run();
