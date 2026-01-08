// services/parking-service/config/db.js
const sql = require("mssql");

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  server: process.env.DB_SERVER,
  port: Number(process.env.DB_PORT) || 1433,
  options: {
    encrypt: String(process.env.DB_ENCRYPT || "false").toLowerCase() === "true",
    trustServerCertificate: String(process.env.DB_TRUST_CERT || "true").toLowerCase() === "true",
  },
};

const pool = new sql.ConnectionPool(config);

const poolConnect = pool.connect(); // mos e kap këtu

module.exports = { sql, pool, poolConnect };