require("dotenv").config({ path: "./services/reservation-service/.env" });
const { sql, pool, poolConnect } = require("./services/reservation-service/config/db");

async function run() {
    try {
        const p = await poolConnect;
        console.log("Connected to DB");

        const result = await p.request().query("SELECT TOP 10 * FROM ParkingSpots");
        console.log("Spots:", result.recordset);

        pool.close();
    } catch (err) {
        console.error("Error:", err);
    }
}

run();
