// services/reservation-service/config/db.js
const sql = require("mssql");

const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER || "localhost",
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT || 1433),
  options: {
    encrypt: false,              // nëse s'ke Azure, false zakonisht
    trustServerCertificate: true // për local dev
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

const pool = new sql.ConnectionPool(dbConfig);

const poolConnect = pool
  .connect()
  .then((p) => {
    console.log("✅ DB pool connected");
    return p;
  })
  .catch((err) => {
    console.error("❌ DB pool failed:", err);
    throw err;
  });

module.exports = { sql, pool, poolConnect };
