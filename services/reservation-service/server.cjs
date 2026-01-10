// services/reservation-service/server.cjs
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const { poolConnect } = require("./config/db");
const { producer, enabled: kafkaEnabled } = require("./config/kafka");

console.log(
  "[startup] env KAFKA_ENABLED=",
  process.env.KAFKA_ENABLED,
  "KAFKA_BROKERS=",
  process.env.KAFKA_BROKERS,
  "KAFKA_TOPIC=",
  process.env.KAFKA_TOPIC
);

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
      return res.json({ ok: true, kafkaEnabled, sent: null });
    }

    await producer.send({
      topic: process.env.KAFKA_TOPIC || "parking-events",
      messages: [{ value: JSON.stringify(message) }],
    });

    console.log("📨 Published TestMessage to", process.env.KAFKA_TOPIC || "parking-events");
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
    console.log("✅ Kafka enabled");
    try {
      await producer.connect();
      console.log("✅ Kafka producer connected");
    } catch (err) {
      console.warn("⚠️ Kafka connection failed (continuing without Kafka):", err.message);
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

async function shutdown(signal) {
  try {
    if (kafkaEnabled) {
      await producer.disconnect();
    }
  } catch (err) {
    console.warn("⚠️ Kafka disconnect failed:", err.message);
  } finally {
    console.log(`Shutting down (${signal})`);
    process.exit(0);
  }
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

/*
How to test (Kafka events)
1. docker compose up -d --build
2. docker exec -it parkingmanagement-kafka-1 bash
3. kafka-console-consumer --bootstrap-server kafka:29092 --topic parking-events --from-beginning
4. Create a reservation in the frontend
5. Verify the JSON event appears in the consumer
*/
