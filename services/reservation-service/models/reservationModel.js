// backend/models/reservationModel.js
const { sql, pool, poolConnect } = require("../config/db");

const Reservation = {
  // Check if a spot has overlapping reservations
  hasOverlap: async (spot_id, start_time, end_time) => {
    await poolConnect;
    const result = await pool
      .request()
      .input("spot_id", sql.Int, spot_id)
      .input("start_time", sql.DateTime2, start_time)
      .input("end_time", sql.DateTime2, end_time)
      .query(`
        SELECT COUNT(*) AS cnt
        FROM dbo.reservations
        WHERE spot_id = @spot_id
          AND @start_time < end_time
          AND @end_time > start_time
      `);
    return (result.recordset[0]?.cnt || 0) > 0;
  },
  getReservedSpotIds: async (start_time, end_time, parkingId) => {
    await poolConnect;
    const request = pool
      .request()
      .input("start_time", sql.DateTime2, start_time)
      .input("end_time", sql.DateTime2, end_time);

    let query = `
      SELECT DISTINCT r.spot_id
      FROM dbo.reservations r
      JOIN dbo.ParkingSpots ps ON ps.id = r.spot_id
      WHERE @start_time < r.end_time
        AND @end_time > r.start_time
    `;

    if (parkingId) {
      request.input("ParkingId", sql.Int, parkingId);
      query += " AND ps.ParkingId = @ParkingId";
    }

    const result = await request.query(query);
    return result.recordset.map((row) => String(row.spot_id));
  },
  // GET /api/reservations
  getAll: async () => {
    await poolConnect;
    const result = await pool.request().query(`
      SELECT r.id,
             r.user_id,
             r.spot_id,
             ps.spot_number,
             ps.ParkingId,
             p.Name AS parking_name,
             r.start_time,
             r.end_time
      FROM dbo.reservations r
      JOIN dbo.ParkingSpots ps ON ps.id = r.spot_id
      JOIN dbo.Parkings p ON p.Id = ps.ParkingId
      ORDER BY r.start_time DESC
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
        SELECT r.id,
               r.user_id,
               r.spot_id,
               ps.spot_number,
               ps.ParkingId,
               p.Name AS parking_name,
               r.start_time,
               r.end_time
        FROM dbo.reservations r
        JOIN dbo.ParkingSpots ps ON ps.id = r.spot_id
        JOIN dbo.Parkings p ON p.Id = ps.ParkingId
        WHERE r.id = @Id
      `);

    return result.recordset[0] || null;
  },

  // GET reservations by user (pa join, safe)
  getByUser: async (user_id) => {
    await poolConnect;
    const result = await pool
      .request()
      .input("user_id", sql.Int, user_id)
      .query(`
      SELECT r.id, r.user_id, r.spot_id,
             ps.spot_number,
             ps.ParkingId,
             p.Name AS parking_name,
             r.start_time, r.end_time
      FROM dbo.reservations r
      JOIN dbo.ParkingSpots ps ON ps.id = r.spot_id
      JOIN dbo.Parkings p ON p.Id = ps.ParkingId
      WHERE r.user_id = @user_id
      ORDER BY r.id DESC
    `);
    return result.recordset;
  },


  // backend/models/reservationModel.js (vetëm create e re)
  create: async (data) => {
    await poolConnect;

    const { user_id, spot_id, start_time, end_time } = data;

    // ✅ user_id vjen nga controller (JWT), prapë e validon por tash s’duhet me mungua
    if (!user_id || !spot_id || !start_time || !end_time) {
      throw new Error("Të gjitha fushat (user_id, spot_id, start_time, end_time) janë të detyrueshme.");
    }

    const start = new Date(start_time);
    const end = new Date(end_time);

    if (isNaN(start) || isNaN(end)) {
      throw new Error("Formati i datës/ores nuk është i vlefshëm.");
    }

    if (start >= end) {
      throw new Error("start_time duhet të jetë më i hershëm se end_time.");
    }

    const diffHours = (end - start) / (1000 * 60 * 60);
    if (diffHours > 8) {
      throw new Error("Rezervimi nuk mund të jetë më i gjatë se 8 orë.");
    }

    const tx = new sql.Transaction(pool);

    try {
      await tx.begin();

      // 1) verifiko spot
      let request = new sql.Request(tx);
      const spotResult = await request
        .input("spot_id", sql.Int, spot_id)
        .query(`SELECT id, status FROM dbo.ParkingSpots WHERE id = @spot_id`);

      if (spotResult.recordset.length === 0) {
        throw new Error("Parking spot nuk ekziston.");
      }

      const spotStatus = spotResult.recordset[0].status;
      if (spotStatus !== "free") {
        throw new Error("Ky vend parkimi është i zënë.");
      }

      // 3) kontrollo mbivendosje
      request = new sql.Request(tx);
      const overlapResult = await request
        .input("spot_id", sql.Int, spot_id)
        .input("start_time", sql.DateTime2, start)
        .input("end_time", sql.DateTime2, end)
        .query(`
        SELECT COUNT(*) AS cnt
        FROM dbo.reservations
        WHERE spot_id = @spot_id
          AND NOT (end_time <= @start_time OR start_time >= @end_time)
      `);

      if (overlapResult.recordset[0].cnt > 0) {
        throw new Error("Ky vend tashmë është i rezervuar në këtë orar.");
      }

      // 4) mos lejo më shumë se 1 rezervim aktiv (strict)
      // 4) Check removed: We now allow multiple reservations per user (overlap check still applies)
      // The strict "one active reservation" rule was preventing users from booking future slots.

      // 5) insert reservation
      request = new sql.Request(tx);
      const insertResult = await request
        .input("user_id", sql.Int, user_id)
        .input("spot_id", sql.Int, spot_id)
        .input("start_time", sql.DateTime2, start)
        .input("end_time", sql.DateTime2, end)
        .query(`
        INSERT INTO dbo.reservations (user_id, spot_id, start_time, end_time)
        OUTPUT INSERTED.*
        VALUES (@user_id, @spot_id, @start_time, @end_time)
      `);

      const created = insertResult.recordset[0];

      // 6) bëje spot occupied
      request = new sql.Request(tx);
      await request
        .input("spot_id", sql.Int, spot_id)
        .query(`
        UPDATE dbo.ParkingSpots
        SET status = 'occupied'
        WHERE id = @spot_id
      `);

      await tx.commit();
      return created;
    } catch (err) {
      await tx.rollback();
      throw err;
    }
  },


  // PUT /api/reservations/:id
  update: async (id, data) => {
    await poolConnect;

    const { start_time, end_time } = data;

    if (!start_time || !end_time) {
      throw new Error("start_time dhe end_time janë të detyrueshme.");
    }

    const start = new Date(start_time);
    const end = new Date(end_time);

    if (start >= end) {
      throw new Error("start_time duhet të jetë më i hershëm se end_time.");
    }

    const tx = new sql.Transaction(pool);

    try {
      await tx.begin();

      // gjej rezervimin ekzistues
      let request = new sql.Request(tx);
      let resResult = await request
        .input("Id", sql.Int, id)
        .query(`SELECT * FROM dbo.reservations WHERE id = @Id`);

      if (resResult.recordset.length === 0) {
        await tx.rollback();
        return null;
      }

      const reservation = resResult.recordset[0];

      // kontrollo mbivendosjet per po te njejtin spot
      request = new sql.Request(tx);
      let overlapResult = await request
        .input("spot_id", sql.Int, reservation.spot_id)
        .input("start_time", sql.DateTime2, start)
        .input("end_time", sql.DateTime2, end)
        .input("Id", sql.Int, id)
        .query(`
          SELECT COUNT(*) AS cnt
          FROM dbo.reservations
          WHERE spot_id = @spot_id
            AND id <> @Id
            AND NOT (end_time <= @start_time OR start_time >= @end_time)
        `);

      if (overlapResult.recordset[0].cnt > 0) {
        throw new Error("Ky vend tashmë është i rezervuar në këtë orar.");
      }

      // bej update
      request = new sql.Request(tx);
      const updateResult = await request
        .input("Id", sql.Int, id)
        .input("start_time", sql.DateTime2, start)
        .input("end_time", sql.DateTime2, end)
        .query(`
          UPDATE dbo.reservations
          SET start_time = @start_time,
              end_time   = @end_time
          OUTPUT INSERTED.*
          WHERE id = @Id
        `);

      await tx.commit();
      return updateResult.recordset[0];
    } catch (err) {
      await tx.rollback();
      throw err;
    }
  },

  // DELETE /api/reservations/:id
  delete: async (id) => {
    await poolConnect;
    const tx = new sql.Transaction(pool);

    try {
      await tx.begin();

      let request = new sql.Request(tx);

      // gjej spot_id per kete rezervim
      const resResult = await request
        .input("Id", sql.Int, id)
        .query(`SELECT spot_id FROM dbo.reservations WHERE id = @Id`);

      if (resResult.recordset.length === 0) {
        await tx.rollback();
        return false;
      }

      const spotId = resResult.recordset[0].spot_id;

      // fshije rezervimin
      request = new sql.Request(tx);
      await request
        .input("Id", sql.Int, id)
        .query(`DELETE FROM dbo.reservations WHERE id = @Id`);

      // liroje vendin
      request = new sql.Request(tx);
      await request
        .input("spot_id", sql.Int, spotId)
        .query(`
          UPDATE dbo.ParkingSpots
          SET status = 'free'
          WHERE id = @spot_id
        `);

      await tx.commit();
      return true;
    } catch (err) {
      await tx.rollback();
      throw err;
    }
  },
};

module.exports = Reservation;
