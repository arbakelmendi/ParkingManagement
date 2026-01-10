// services/auth-service/config/db.js
const sql = require("mssql");

const config = {
  user: process.env.DB_USER || "sa",
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER || "localhost",
  port: parseInt(process.env.DB_PORT || "1433", 10),
  database: process.env.DB_NAME || "master",
  options: {
    encrypt: String(process.env.DB_ENCRYPT).toLowerCase() === "true",
    trustServerCertificate: String(process.env.DB_TRUST_CERT).toLowerCase() === "true",
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

const pool = new sql.ConnectionPool(config);

const poolConnect = pool
  .connect()
  .then(() => {
    console.log("✅ Auth DB connected");
    return pool;
  })
  .catch((err) => {
    console.error("❌ Auth DB connection failed:", err);
    throw err;
  });

// ✅ kjo ekziston për ata që e thërrasin connectWithRetry()
async function connectWithRetry() {
  return poolConnect; // pret lidhjen (ose hedh error)
}

module.exports = { sql, pool, poolConnect, connectWithRetry };
