require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const { poolConnect } = require("./config/db"); // nëse parking-service përdor DB
const { consumer, enabled: kafkaEnabled } = require("./config/kafka");

const app = express();

const parkingRoutes = require("./routes/parkingRoutes");
const spotRoutes = require("./routes/spotRoutes");

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log("[HIT]", req.method, req.url);
  next();
});


app.use((req, res, next) => {
  console.log(`[HIT] ${req.method} ${req.url}`);
  next();
});


app.get("/api/test", (req, res) => res.json({ ok: true, test: "works" }));
app.get("/api/test2", (req, res) => res.send("TEST2 OK"));


app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// FIX: Explicit route to ensure spots endpoints work if router fails
const parkingController = require("./controllers/parkingController");
app.get("/api/parkings/:id/spots", parkingController.getParkingSpots);

app.use("/api/parkings", parkingRoutes);
app.use("/api/spots", spotRoutes);

function listRoutes(prefix, router) {
  console.log(`\n📌 Routes under ${prefix}:`);
  router.stack.forEach((layer) => {
    if (layer.route) {
      const methods = Object.keys(layer.route.methods).join(",").toUpperCase();
      console.log(`  ${methods.padEnd(6)} ${prefix}${layer.route.path}`);
    }
  });
}

listRoutes("/api/parkings", parkingRoutes);
listRoutes("/api/spots", spotRoutes);


console.log("🔥 RUNNING FILE:", __filename);
console.log("✅ parkingRoutes type:", typeof parkingRoutes);
console.log("✅ parkingRoutes stack length:", parkingRoutes?.stack?.length);

console.log("✅ spotRoutes type:", typeof spotRoutes);
console.log("✅ spotRoutes stack length:", spotRoutes?.stack?.length);

// print all registered routes (simple)
if (app._router?.stack) {
  const routers = app._router.stack.filter((l) => l.name === "router");
  console.log("✅ app routers mounted:", routers.length);
  routers.forEach((r, i) => {
    console.log(`  Router[${i}] path=`, r?.regexp?.toString?.() || r?.path);
  });
}




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