const express = require("express");
const app = express();
require("dotenv").config(); //to_do understand env variables

const parkingRoutes = require("./routes/parkingRoutes");
const { poolConnect } = require("./config/db");
const reservationRoutes = require("./routes/reservationRoutes");
const spotRoutes = require("./routes/spotRoutes");
const userRoutes = require("./routes/userRoutes");


app.use(express.json());
//kur useri thirr /api/parkings shko tek ./routes/parkingRoutes
app.use("/api/parkings", parkingRoutes);

app.use("/api/reservations", reservationRoutes);

app.use("/api/spots", spotRoutes);

app.use("/api/users", userRoutes);


// route testimi
app.get("/test-db", async (req, res) => {
  try {
    await poolConnect;
    
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));



