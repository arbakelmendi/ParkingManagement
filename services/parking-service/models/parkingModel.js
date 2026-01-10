// backend/models/parkingModel.js
const { sql, pool, poolConnect } = require("../config/db");

const Parking = {
  getAll: async () => {
    await poolConnect;
    const result = await pool.request().query(`
      SELECT
        p.Id,
        p.Name,
        p.Location,
        p.Capacity,
        p.Occupied,
        COUNT(ps.id) AS TotalSpots,
        SUM(CASE WHEN ps.status = 'free' THEN 1 ELSE 0 END) AS AvailableSpots
      FROM Parkings p
      LEFT JOIN ParkingSpots ps ON ps.ParkingId = p.Id
      GROUP BY p.Id, p.Name, p.Location, p.Capacity, p.Occupied
      ORDER BY p.Id ASC
    `);
    return result.recordset;
  },

  getById: async (id) => {
    await poolConnect;
    const result = await pool
      .request()
      .input("Id", sql.Int, id)
      .query(`
        SELECT
          p.Id,
          p.Name,
          p.Location,
          p.Capacity,
          p.Occupied,
          COUNT(ps.id) AS TotalSpots,
          SUM(CASE WHEN ps.status = 'free' THEN 1 ELSE 0 END) AS AvailableSpots
        FROM Parkings p
        LEFT JOIN ParkingSpots ps ON ps.ParkingId = p.Id
        WHERE p.Id = @Id
        GROUP BY p.Id, p.Name, p.Location, p.Capacity, p.Occupied
      `);
    return result.recordset[0] || null;
  },

  create: async (data) => {
    await poolConnect;
    const result = await pool
      .request()
      .input("Name", sql.NVarChar(100), data.name)
      .input("Location", sql.NVarChar(200), data.location)
      .input("Capacity", sql.Int, data.capacity)
      .input("Occupied", sql.Int, data.occupied || 0)
      .query(`
        INSERT INTO Parkings (Name, Location, Capacity, Occupied)
        OUTPUT INSERTED.*
        VALUES (@Name, @Location, @Capacity, @Occupied)
      `);
    return result.recordset[0];
  },

  update: async (id, data) => {
    await poolConnect;
    const result = await pool
      .request()
      .input("Id", sql.Int, id)
      .input("Name", sql.NVarChar(100), data.name)
      .input("Location", sql.NVarChar(200), data.location)
      .input("Capacity", sql.Int, data.capacity)
      .input("Occupied", sql.Int, data.occupied)
      .query(`
        UPDATE Parkings
        SET Name = @Name,
            Location = @Location,
            Capacity = @Capacity,
            Occupied = @Occupied
        OUTPUT INSERTED.*
        WHERE Id = @Id
      `);
    return result.recordset[0] || null;
  },

  delete: async (id) => {
    await poolConnect;
    await pool
      .request()
      .input("Id", sql.Int, id)
      .query(`DELETE FROM Parkings WHERE Id = @Id`);
    return true;
  },

  incrementOccupied: async (parkingId) => {
    await poolConnect;
    const result = await pool
      .request()
      .input("Id", sql.Int, parkingId)
      .query(`
        UPDATE Parkings
        SET Occupied = Occupied + 1
        OUTPUT INSERTED.*
        WHERE Id = @Id
      `);
    return result.recordset[0];
  },

  decrementOccupied: async (parkingId) => {
    await poolConnect;
    const result = await pool
      .request()
      .input("Id", sql.Int, parkingId)
      .query(`
        UPDATE Parkings
        SET Occupied = CASE WHEN Occupied > 0 THEN Occupied - 1 ELSE 0 END
        OUTPUT INSERTED.*
        WHERE Id = @Id
      `);
    return result.recordset[0];
  },
};

module.exports = Parking;
