// backend/server.cjs
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const { connectWithRetry } = require("./config/db");

const app = express();

app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:5174"],
    credentials: true,
  })
);

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "auth-service" });
});

const PORT = process.env.PORT || 3001;

(async () => {
  try {
    await connectWithRetry();
    app.listen(PORT, () => {
      console.log(`auth-service running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Auth-service failed to start:", err.message);
    process.exit(1);
  }
})();
