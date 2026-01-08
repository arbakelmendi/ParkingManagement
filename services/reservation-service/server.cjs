// services/reservation-service/server.cjs
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const { poolConnect } = require("./config/db");
const { producer, enabled: kafkaEnabled } = require("./config/kafka");

// routes
const reservationRoutes = require("./routes/reservationRoutes");

const app = express();

// middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// health check
app.get("/health", (req, res) => {
  res.json({ ok: true, service: "reservation-service" });
});

// API
app.use("/api/reservations", reservationRoutes);

// test DB
app.get("/test-db", async (req, res) => {
  try {
    await poolConnect;
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false });
  }
});

// test Kafka
app.get("/api/test-kafka", async (req, res) => {
  try {
    const message = {
      type: "TestMessage",
      text: "Hello from Reservation Service",
      timestamp: new Date().toISOString(),
    };

    await producer.send({
      topic: process.env.KAFKA_TOPIC || "parking-events",
      messages: [{ value: JSON.stringify(message) }],
    });

    res.json({ ok: true, sent: message, kafkaEnabled: kafkaEnabled });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

const PORT = process.env.PORT || 3000;

async function start() {
  // DB
  try {
    await poolConnect;
  } catch (err) {
    console.error("❌ DB connection failed", err);
    process.exit(1);
  }

  // Kafka (opsionale)
  if (kafkaEnabled) {
    try {
      await producer.connect();
      console.log(" Kafka producer connected");
    } catch (err) {
      console.error(" Kafka connection failed (continuing without Kafka):", err.message);
      // MOS e ndal service-in
    }
  } else {
    console.log("ℹ Kafka disabled (KAFKA_ENABLED=false)");
  }

  app.listen(PORT, () => {
    console.log(` reservation-service running on port ${PORT}`);
  });
}

start();

console.log("DB_SERVER =", process.env.DB_SERVER);