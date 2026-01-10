// services/reservation-service/server.cjs
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const { poolConnect } = require("./config/db");
const { producer, enabled: kafkaEnabled } = require("./config/kafka");

const reservationRoutes = require("./routes/reservationRoutes");
const adminRoutes = require("./routes/adminRoutes");

const app = express();
console.log("RESERVATION SERVICE BUILD:", "2026-01-10 A", __filename);


// --- middleware base ---
app.use(
  helmet({
    // Dev-friendly. Në prod mundesh me e rrit sigurinë.
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:5174"],
    credentials: true,
  })
);

app.use(express.json());

// --- request logger (1 herë mjafton) ---
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// --- health ---
app.get("/health", (req, res) => {
  res.json({ ok: true, service: "reservation-service" });
});

// --- API ---
app.use("/api/reservations", reservationRoutes);
app.use("/api/admin", adminRoutes);

// --- test DB ---
app.get("/test-db", async (req, res) => {
  try {
    await poolConnect;
    res.json({ ok: true });
  } catch (err) {
    console.error("DB test failed:", err);
    res.status(500).json({ ok: false, message: "DB not OK" });
  }
});

// --- test Kafka (optional) ---
app.get("/api/test-kafka", async (req, res) => {
  try {
    const message = {
      type: "TestMessage",
      text: "Hello from Reservation Service",
      timestamp: new Date().toISOString(),
    };

    // nëse s’është enabled, mos provo fare
    if (!kafkaEnabled) {
      return res.json({ ok: true, kafkaEnabled: false, sent: null });
    }

    await producer.send({
      topic: process.env.KAFKA_TOPIC || "parking-events",
      messages: [{ value: JSON.stringify(message) }],
    });

    res.json({ ok: true, kafkaEnabled: true, sent: message });
  } catch (err) {
    console.error("Kafka test failed:", err);
    res.status(500).json({ ok: false, message: err.message });
  }
});

// --- 404 handler ---
app.use((req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.url}` });
});

// Force show real error in dev (before anything masks it)
app.use((err, req, res, next) => {
  console.error("🔥 RAW ERROR:", err);
  res.status(500).json({
    error: err.message,
    stack: err.stack,
  });
});


// --- global error handler ---
app.use((err, req, res, next) => {
  console.error("🔥 ERROR:", err);
  res.status(err.status || 500).json({
    message: err.message || "Internal Server Error",
    // dev only
    stack: err.stack,
  });
});

const PORT = Number(process.env.PORT || 3003);

async function start() {
  // DB
  try {
    await poolConnect;
    console.log("✅ Database connected");
  } catch (err) {
    console.error("❌ DB connection failed", err);
    process.exit(1);
  }

  // Kafka (opsionale)
  if (kafkaEnabled) {
    try {
      await producer.connect();
      console.log("✅ Kafka producer connected");
    } catch (err) {
      console.error("⚠️ Kafka connection failed (continuing without Kafka):", err.message);
      // mos e ndal service-in
    }
  } else {
    console.log("ℹ️ Kafka disabled (KAFKA_ENABLED=false)");
  }

  app.listen(PORT, () => {
    console.log(`🚀 reservation-service running on port ${PORT}`);
  });
}

start();
