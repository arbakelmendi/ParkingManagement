require("dotenv").config({ path: "./services/parking-service/.env" });
const { sql, pool, poolConnect } = require("./services/parking-service/config/db");

async function run() {
    try {
        await poolConnect;
        console.log("Connected to DB");

        // Check Parkings
        const parkings = await pool.request().query("SELECT TOP 5 * FROM Parkings");
        console.log("Parkings:", parkings.recordset);

        if (parkings.recordset.length > 0) {
            const pId = parkings.recordset[0].id;
            // Check Spots for first parking
            const spots = await pool.request()
                .input("pid", sql.Int, pId)
                .query("SELECT * FROM ParkingSpots WHERE ParkingId = @pid");
            console.log(`Spots for Parking ${pId}:`, spots.recordset);
        } else {
            console.log("No parkings found.");
        }

        pool.close();
    } catch (err) {
        console.error("Error:", err);
    }
}

run();
