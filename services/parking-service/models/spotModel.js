// backend/models/spotModel.js
const { sql, pool, poolConnect } = require("../config/db");

const Spot = {
  getAll: async () => {
    await poolConnect;
    const result = await pool.request().query(`
      SELECT id, spot_number, status, ParkingId
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
        SELECT id, spot_number, status, ParkingId
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
      .input("ParkingId", sql.Int, data.ParkingId) // ✅ FK
      .query(`
      INSERT INTO ParkingSpots (spot_number, status, ParkingId)
      OUTPUT INSERTED.*
      VALUES (@SpotNumber, @Status, @ParkingId)
    `);
    return result.recordset[0];
  },

  update: async (id, data) => {
    await poolConnect;
    const result = await pool
      .request()
      .input("Id", sql.Int, id)
      .input("SpotNumber", sql.Int, data.spot_number ?? null)
      .input("Status", sql.NVarChar(20), data.status ?? null)
      .input("ParkingId", sql.Int, data.ParkingId ?? data.parkingId ?? null)
      .query(`
        UPDATE ParkingSpots
        SET spot_number = COALESCE(@SpotNumber, spot_number),
            status      = COALESCE(@Status, status),
            ParkingId   = COALESCE(@ParkingId, ParkingId)
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

  // vetem status (free/occupied)
  setStatus: async (id, status) => {
    await poolConnect;
    const result = await pool
      .request()
      .input("Id", sql.Int, id)
      .input("Status", sql.NVarChar(20), status)
      .query(`
        UPDATE ParkingSpots
        SET status = @Status
        OUTPUT INSERTED.*
        WHERE id = @Id
      `);
    return result.recordset[0] || null;
  },

  getByParkingId: async (parkingId) => {
    await poolConnect;
    const result = await pool
      .request()
      .input("ParkingId", sql.Int, parkingId)
      .query(`
        SELECT id, spot_number, status, ParkingId
        FROM ParkingSpots
        WHERE ParkingId = @ParkingId
        ORDER BY spot_number ASC
      `);
    return result.recordset;
  },
};

module.exports = Spot;
