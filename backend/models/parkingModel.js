// backend/models/parkingModel.js
const { sql, pool, poolConnect } = require("../config/db");

const Parking = {
  getAll: async () => {
    await poolConnect; 
    //get all parking attributes
    const result = await pool.request().query(`
      SELECT Id, Name, Capacity, Occupied
      FROM Parkings
      ORDER BY Id ASC
    `);
    return result.recordset;
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
        SET Occupied = CASE 
                         WHEN Occupied > 0 THEN Occupied - 1 
                         ELSE 0 
                       END
        OUTPUT INSERTED.*
        WHERE Id = @Id
      `);
    return result.recordset[0];
  },


  getById: async (id) => {
    await poolConnect;
    const result = await pool
      .request()
      .input("Id", sql.Int, id)
      .query(`
        SELECT Id, Name, Capacity, Occupied
        FROM Parkings
        WHERE Id = @Id
      `);
    return result.recordset[0] || null;
  },

  create: async (data) => {
    await poolConnect;
    const result = await pool
      .request()
      .input("Name", sql.NVarChar(100), data.name)
      .input("Capacity", sql.Int, data.capacity)
      .input("Occupied", sql.Int, data.occupied)
      .query(`
        INSERT INTO Parkings (Name, Capacity, Occupied)
        OUTPUT INSERTED.*
        VALUES (@Name, @Capacity, @Occupied)
      `);
    return result.recordset[0];
  },

  update: async (id, data) => {
    await poolConnect;
    const result = await pool
      .request()
      .input("Id", sql.Int, id)
      .input("Name", sql.NVarChar(100), data.name)
      .input("Capacity", sql.Int, data.capacity)
      .input("Occupied", sql.Int, data.occupied)
      .query(`
        UPDATE Parkings
        SET Name = @Name,
            Capacity = @Capacity,
            Occupied = @Occupied
        OUTPUT INSERTED.*
        WHERE Id = @Id
      `);
    return result.recordset[0];
  },

  delete: async (id) => {
    await poolConnect;
    await pool
      .request()
      .input("Id", sql.Int, id)
      .query(`
        DELETE FROM Parkings
        WHERE Id = @Id
      `);
    return true;
  },
};

module.exports = Parking;
