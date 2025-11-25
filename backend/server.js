const express = require("express");
const cors = require("cors");
const parkingRoutes = require("./routes/parkingRoutes");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/parking", parkingRoutes);

app.get("/", (req, res) => {
  res.send("Parking Management API Running");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
