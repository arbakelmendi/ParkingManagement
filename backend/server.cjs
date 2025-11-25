import express from "express";
const { connectDB } = require("./db"); // rruga e saktë e db.js

const app = express();
app.use(express.json());

// LIDHJA ME DATABASE
connectDB();

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
