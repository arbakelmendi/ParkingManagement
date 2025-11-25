const sql = require("mssql");

const config = {
  user: "sa",                              // username i SQL Server
  password: "YOUR_PASSWORD",               // password i SQL Server
  server: "localhost",                     // zakonisht localhost
  database: "parking_management",          // emri i databazës
  options: {
    trustServerCertificate: true           // e lejon certifikatën lokale
  }
};

async function connectDB() {
  try {
    await sql.connect(config);
    console.log("Connected to MSSQL!");
  } catch (err) {
    console.error("Database connection failed:", err);
  }
}

module.exports = { sql, connectDB };
