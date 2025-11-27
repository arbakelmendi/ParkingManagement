// backend/config/db.js
const sql = require("mssql");

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  server: process.env.DB_SERVER,
  port: Number(process.env.DB_PORT),
  options: {
    encrypt: false,            // se jemi lokal
    trustServerCertificate: true,
  },
};

// krijo connection pool
const pool = new sql.ConnectionPool(config);
const poolConnect = pool
  .connect()
  .then(() => {
    console.log("✅ Database connected");
  })
  .catch((err) => {
    console.error("❌ Database connection failed:", err);
  });

module.exports = {
  sql,
  pool,
  poolConnect,
};
