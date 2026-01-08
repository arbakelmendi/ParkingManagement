// server.cjs
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const { poolConnect } = require("./config/db"); // ✅

const parkingRoutes = require("./routes/parkingRoutes");
const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => res.json({ ok: true, service: "parking-service" }));
app.use("/parkings", parkingRoutes);

const PORT = process.env.PORT || 3002;

(async () => {
  await poolConnect; // ✅ poolConnect është Promise
  app.listen(PORT, () => console.log(`parking-service running on port ${PORT}`));
})();
