const db = require("../config/db");

const Parking = {
  getAll: async () => {
    const result = await db.query("SELECT * FROM parkings ORDER BY id ASC");
    return result.rows;
  },

  getById: async (id) => {
    const result = await db.query("SELECT * FROM parkings WHERE id = $1", [id]);
    return result.rows[0];
  },

  create: async (data) => {
    const result = await db.query(
      "INSERT INTO parkings (name, capacity, occupied) VALUES ($1,$2,$3) RETURNING *",
      [data.name, data.capacity, data.occupied]
    );
    return result.rows[0];
  },

  update: async (id, data) => {
    const result = await db.query(
      "UPDATE parkings SET name=$1, capacity=$2, occupied=$3 WHERE id=$4 RETURNING *",
      [data.name, data.capacity, data.occupied, id]
    );
    return result.rows[0];
  },

  delete: async (id) => {
    await db.query("DELETE FROM parkings WHERE id=$1", [id]);
    return true;
  }
};

module.exports = Parking;
