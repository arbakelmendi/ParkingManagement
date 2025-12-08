/*/ backend/server.cjs
const express = require("express");
const path = require("path");
const cors = require("cors");
const app = express();

require("dotenv").config();

const { poolConnect } = require("./config/db");

// ROUTES nga backend-i
const parkingRoutes = require("./routes/parkingRoutes");
const reservationRoutes = require("./routes/reservationRoutes");
const spotRoutes = require("./routes/spotRoutes");
const userRoutes = require("./routes/userRoutes");

// --------------------
// MIDDLEWARES
// --------------------
app.use(cors());
app.use(express.json());

// --------------------
// API ROUTES
// --------------------
app.use("/api/parkings", parkingRoutes);
app.use("/api/reservations", reservationRoutes);
app.use("/api/spots", spotRoutes);
app.use("/api/users", userRoutes);

// test per DB
app.get("/test-db", async (req, res) => {
  try {
    await poolConnect;
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// --------------------
// FRONTEND (STATIC FILES)
// --------------------

// rruga deri te folderi frontend (ti ke strukturë: root/frontend/...)
const frontendPath = path.join(__dirname, "..", "frontend");

// servojmë CSS, JS, imazhe, etj.
app.use(express.static(frontendPath));

// kur dikush shkon te http://localhost:3000/ → dërgo index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(frontendPath, "html", "index.html"));
});

// --------------------
// START SERVER
// --------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));*/

// backend/server.cjs
// backend/server.cjs
const express = require("express");
const path = require("path");
const cors = require("cors");
require("dotenv").config();

const { poolConnect } = require("./config/db");

// ROUTES
const { producer } = require("./config/kafka");
const parkingRoutes = require("./routes/parkingRoutes");
const reservationRoutes = require("./routes/reservationRoutes");
const spotRoutes = require("./routes/spotRoutes");
const userRoutes = require("./routes/userRoutes");


const app = express();

// ----- MIDDLEWARE BAZË -----
app.use(cors());
app.use(express.json());

// LOGO KËRKESAT NË TERMINAL (për debug)
app.use((req, res, next) => {
  console.log("Request:", req.method, req.url);
  next();
});

// ----- API ROUTES -----
app.use("/api/parkings", parkingRoutes);
app.use("/api/reservations", reservationRoutes);
app.use("/api/parking-spots", spotRoutes);
app.use("/api/users", userRoutes);

// ----- FRONTEND (static files) -----
const frontendPath = path.join(__dirname, "..", "frontend");

// CSS, JS, foto, etj.
app.use(express.static(frontendPath));

console.log("Frontend path:", frontendPath);

// index.html kur shkojmë te /
app.get("/", (req, res) => {
  console.log("Serving index.html...");
  res.sendFile(path.join(frontendPath, "html", "index.html"));
});

// endpoint për test DB (opsional)
app.get("/test-db", async (req, res) => {
  try {
    await poolConnect;
    res.json({ ok: true });
  } catch (err) {
    console.error("test-db error:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);

  // lidhu me Kafka producer
  try {
    await producer.connect();
    console.log("✅Kafka producer connected");
  } catch (err) {
    console.error("❌Kafka producer failed to connect:", err);
  }
});
  
app.get("/api/test-kafka", async (req, res) => {
  try {
    const message = {
      type: "TestMessage",
      text: "Hello from ParkingManagement!",
      timestamp: new Date().toISOString(),
    };

    await producer.send({
      topic: "parking-events",
      messages: [{ value: JSON.stringify(message) }],
    });

    console.log("📤Sent test message to Kafka:", message);

    res.json({ ok: true, sent: message });
  } catch (err) {
    console.error("Error sending test Kafka message:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});



