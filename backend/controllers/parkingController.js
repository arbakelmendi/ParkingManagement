const Parking = require("../models/parkingModel");

exports.getAllParkings = async (req, res) => {
  try {
    const data = await Parking.getAll();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }
};

exports.getParking = async (req, res) => {
  try {
    const data = await Parking.getById(req.params.id);
    if (!data) return res.status(404).json({ message: "Not Found" });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }
};

exports.createParking = async (req, res) => {
  try {
    const newParking = await Parking.create(req.body);
    res.status(201).json(newParking);
  } catch (err) {
    res.status(500).json({ error: "Error creating parking" });
  }
};

exports.updateParking = async (req, res) => {
  try {
    const updated = await Parking.update(req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Error updating parking" });
  }
};

exports.deleteParking = async (req, res) => {
  try {
    await Parking.delete(req.params.id);
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Error deleting parking" });
  }
};
