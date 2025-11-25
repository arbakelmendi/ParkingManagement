const { Pool } = require("pg");

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 5432,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Retry connection
async function connectWithRetry(retries = 5) {
  while (retries) {
    try {
      await pool.connect();
      console.log("✅ PostgreSQL Connected");
      return;
    } catch (err) {
      console.log("❌ DB Connection Failed. Retrying...");
      retries--;
      await new Promise(res => setTimeout(res, 2000));
    }
  }
  process.exit(1);
}

connectWithRetry();

module.exports = pool;
