// backend/models/reservationModel.js
const { sql, pool, poolConnect } = require("../config/db");

const Reservation = {
  // GET /api/reservations
  getAll: async () => {
    await poolConnect;
    const result = await pool.request().query(`
      SELECT r.id,
             r.user_id,
             u.name AS user_name,
             r.spot_id,
             ps.spot_number,
             r.start_time,
             r.end_time
      FROM reservations r
      JOIN users u ON u.id = r.user_id
      JOIN ParkingSpots ps ON ps.id = r.spot_id
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
               u.name AS user_name,
               r.spot_id,
               ps.spot_number,
               r.start_time,
               r.end_time
        FROM reservations r
        JOIN users u ON u.id = r.user_id
        JOIN ParkingSpots ps ON ps.id = r.spot_id
        WHERE r.id = @Id
      `);

    return result.recordset[0] || null;
  },

  // POST /api/reservations
  create: async (data) => {
    await poolConnect;

    const { user_id, spot_id, start_time, end_time } = data;

    // ✅ Validime bazike në backend
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

      // 1️⃣ Verifiko user-in
      let request = new sql.Request(tx);
      let userResult = await request
        .input("user_id", sql.Int, user_id)
        .query(`SELECT id, role FROM users WHERE id = @user_id`);

      if (userResult.recordset.length === 0) {
        throw new Error("Përdoruesi nuk ekziston.");
      }

      // 2️⃣ Verifiko spot-in
      request = new sql.Request(tx);
      let spotResult = await request
        .input("spot_id", sql.Int, spot_id)
        .query(`SELECT id, status FROM ParkingSpots WHERE id = @spot_id`);

      if (spotResult.recordset.length === 0) {
        throw new Error("Parking spot nuk ekziston.");
      }

      const spotStatus = spotResult.recordset[0].status;
      if (spotStatus !== "free") {
        throw new Error("Ky vend parkimi është i zënë.");
      }

      // 3️⃣ Mos lejo mbivendosje për të njëjtin spot
      request = new sql.Request(tx);
      let overlapResult = await request
        .input("spot_id", sql.Int, spot_id)
        .input("start_time", sql.DateTime2, start)
        .input("end_time", sql.DateTime2, end)
        .query(`
          SELECT COUNT(*) AS cnt
          FROM reservations
          WHERE spot_id = @spot_id
            AND NOT (end_time <= @start_time OR start_time >= @end_time)
        `);

      if (overlapResult.recordset[0].cnt > 0) {
        throw new Error("Ky vend tashmë është i rezervuar në këtë orar.");
      }

      // 4️⃣ Mos lejo më shumë se 1 rezervim aktiv për user-in
      request = new sql.Request(tx);
      let activeResult = await request
        .input("user_id", sql.Int, user_id)
        .query(`
          SELECT COUNT(*) AS cnt
          FROM reservations
          WHERE user_id = @user_id
            AND end_time > GETDATE()
        `);

      if (activeResult.recordset[0].cnt > 1) {
        // nëse don më strikte, vendos > 0
        throw new Error("Përdoruesi ka tashmë rezervime aktive.");
      }

      // 5️⃣ Krijo rezervimin
      request = new sql.Request(tx);
      const insertResult = await request
        .input("user_id", sql.Int, user_id)
        .input("spot_id", sql.Int, spot_id)
        .input("start_time", sql.DateTime2, start)
        .input("end_time", sql.DateTime2, end)
        .query(`
          INSERT INTO reservations (user_id, spot_id, start_time, end_time)
          OUTPUT INSERTED.*
          VALUES (@user_id, @spot_id, @start_time, @end_time)
        `);

      const created = insertResult.recordset[0];

      // 6️⃣ Përditëso statusin e vendit në 'occupied'
      request = new sql.Request(tx);
      await request
        .input("spot_id", sql.Int, spot_id)
        .query(`
          UPDATE ParkingSpots
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

  // PUT /api/reservations/:id – (mund ta lëmë më të thjeshtë ose të sforcojmë rregulla njësoj)
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
        .query(`SELECT * FROM reservations WHERE id = @Id`);

      if (resResult.recordset.length === 0) {
        await tx.rollback();
        return null;
      }

      const reservation = resResult.recordset[0];

      // kontrollo mbivendosjet për po të njejtin spot
      request = new sql.Request(tx);
      let overlapResult = await request
        .input("spot_id", sql.Int, reservation.spot_id)
        .input("start_time", sql.DateTime2, start)
        .input("end_time", sql.DateTime2, end)
        .input("Id", sql.Int, id)
        .query(`
          SELECT COUNT(*) AS cnt
          FROM reservations
          WHERE spot_id = @spot_id
            AND id <> @Id
            AND NOT (end_time <= @start_time OR start_time >= @end_time)
        `);

      if (overlapResult.recordset[0].cnt > 0) {
        throw new Error("Ky vend tashmë është i rezervuar në këtë orar.");
      }

      // bëj update
      request = new sql.Request(tx);
      const updateResult = await request
        .input("Id", sql.Int, id)
        .input("start_time", sql.DateTime2, start)
        .input("end_time", sql.DateTime2, end)
        .query(`
          UPDATE reservations
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

      // gjej spot_id për këtë rezervim
      const resResult = await request
        .input("Id", sql.Int, id)
        .query(`SELECT spot_id FROM reservations WHERE id = @Id`);

      if (resResult.recordset.length === 0) {
        await tx.rollback();
        return false;
      }

      const spotId = resResult.recordset[0].spot_id;

      // fshije rezervimin
      request = new sql.Request(tx);
      await request
        .input("Id", sql.Int, id)
        .query(`DELETE FROM reservations WHERE id = @Id`);

      // lëroje vendin
      request = new sql.Request(tx);
      await request
        .input("spot_id", sql.Int, spotId)
        .query(`
          UPDATE ParkingSpots
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
