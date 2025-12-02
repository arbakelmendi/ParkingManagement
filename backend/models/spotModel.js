// backend/models/spotModel.js
const { sql, pool, poolConnect } = require("../config/db");

const Spot = {
  getAll: async () => {
    await poolConnect;
    const result = await pool.request().query(`
      SELECT id, spot_number, status
      FROM ParkingSpots
      ORDER BY id ASC
    `);
    return result.recordset;
  },

  getById: async (id) => {
    await poolConnect;
    const result = await pool
      .request()
      .input("Id", sql.Int, id)
      .query(`
        SELECT id, spot_number, status
        FROM ParkingSpots
        WHERE id = @Id
      `);
    return result.recordset[0] || null;
  },

  create: async (data) => {
    await poolConnect;
    const result = await pool
      .request()
      .input("SpotNumber", sql.Int, data.spot_number)
      .input("Status", sql.NVarChar(20), data.status || "free")
      .query(`
        INSERT INTO ParkingSpots (spot_number, status)
        OUTPUT INSERTED.*
        VALUES (@SpotNumber, @Status)
      `);
    return result.recordset[0];
  },

  update: async (id, data) => {
    await poolConnect;
    const result = await pool
      .request()
      .input("Id", sql.Int, id)
      .input("SpotNumber", sql.Int, data.spot_number)
      .input("Status", sql.NVarChar(20), data.status)
      .query(`
        UPDATE ParkingSpots
        SET spot_number = @SpotNumber,
            status = @Status
        OUTPUT INSERTED.*
        WHERE id = @Id
      `);
    return result.recordset[0] || null;
  },

  delete: async (id) => {
    await poolConnect;
    await pool
      .request()
      .input("Id", sql.Int, id)
      .query(`
        DELETE FROM ParkingSpots
        WHERE id = @Id
      `);
    return true;
  },
};

module.exports = Spot;
