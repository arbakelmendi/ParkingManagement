require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const { poolConnect } = require("./config/db"); // nëse parking-service përdor DB
const { consumer, enabled: kafkaEnabled } = require("./config/kafka");

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.get("/health", (req, res) => {
  res.json({ ok: true, service: "parking-service" });
});

const PORT = process.env.PORT || 3002;

async function startKafkaConsumer() {
  const topic = process.env.KAFKA_TOPIC || "parking-events";

  await consumer.connect();
  await consumer.subscribe({ topic, fromBeginning: true });

  console.log(`✅ Kafka consumer connected (topic=${topic})`);

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        const value = message.value?.toString();
        const event = value ? JSON.parse(value) : null;

        console.log("📩 Kafka message received:", event);

        if (event?.type === "ReservationCreated") {
          console.log("✅ Handling ReservationCreated:", event);
          // këtu mundesh me bo update DB në të ardhmen
        }
      } catch (err) {
        console.error("❌ Kafka message error:", err.message);
      }
    },
  });
}

async function start() {
  try {
    await poolConnect;
    console.log("✅ Database connected");
  } catch (err) {
    console.error("❌ DB connection failed", err);
    process.exit(1);
  }

  if (kafkaEnabled) {
    try {
      await startKafkaConsumer();
    } catch (err) {
      console.error("❌ Kafka consumer failed:", err.message);
    }
  } else {
    console.log("ℹ️ Kafka disabled (KAFKA_ENABLED=false)");
  }

  app.listen(PORT, () => {
    console.log(`🚀 parking-service running on port ${PORT}`);
  });
}

start();