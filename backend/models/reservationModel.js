// backend/models/reservationModel.js
const { sql, pool, poolConnect } = require("../config/db");

const Reservation = {
  // GET /api/reservations
  getAll: async () => {
    await poolConnect;
    const result = await pool.request().query(`
      SELECT id, user_id, spot_id, start_time, end_time
      FROM dbo.reservations
      ORDER BY id ASC
    `);
    return result.recordset;
  },

  // GET /api/reservations/:id
  getById: async (id) => {
    await poolConnect;
    const result = await pool
      .request()
      .input("Id", sql.Int, id)
      .query(`
        SELECT id, user_id, spot_id, start_time, end_time
        FROM dbo.reservations
        WHERE id = @Id
      `);
    return result.recordset[0] || null;
  },

  // POST /api/reservations
  create: async (data) => {
    await poolConnect;
    const result = await pool
      .request()
      .input("UserId", sql.Int, data.user_id)
      .input("SpotId", sql.Int, data.spot_id)
      .input("StartTime", sql.DateTime, data.start_time)
      .input("EndTime", sql.DateTime, data.end_time)
      .query(`
        INSERT INTO dbo.reservations (user_id, spot_id, start_time, end_time)
        OUTPUT INSERTED.*
        VALUES (@UserId, @SpotId, @StartTime, @EndTime)
      `);
    return result.recordset[0];
  },

  // PUT /api/reservations/:id
  update: async (id, data) => {
    await poolConnect;
    const result = await pool
      .request()
      .input("Id", sql.Int, id)
      .input("UserId", sql.Int, data.user_id)
      .input("SpotId", sql.Int, data.spot_id)
      .input("StartTime", sql.DateTime, data.start_time)
      .input("EndTime", sql.DateTime, data.end_time)
      .query(`
        UPDATE dbo.reservations
        SET user_id   = @UserId,
            spot_id   = @SpotId,
            start_time = @StartTime,
            end_time   = @EndTime
        OUTPUT INSERTED.*
        WHERE id = @Id
      `);
    return result.recordset[0] || null;
  },

  // DELETE /api/reservations/:id
  delete: async (id) => {
    await poolConnect;
    await pool
      .request()
      .input("Id", sql.Int, id)
      .query(`
        DELETE FROM dbo.reservations
        WHERE id = @Id
      `);
    return true;
  },
};

module.exports = Reservation;
