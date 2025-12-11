// backend/models/userModel.js
const { sql, pool, poolConnect } = require("../config/db");

const User = {
  getAll: async () => {
    await poolConnect;
    const result = await pool.request().query(`
      SELECT id, name, email, password, role
      FROM users
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
        SELECT id, name, email, password, role
        FROM users
        WHERE id = @Id
      `);
    return result.recordset[0] || null;
  },

 
  create: async (data) => {
    await poolConnect;
    const result = await pool
      .request()
      .input("Name", sql.NVarChar(100), data.name)
      .input("Email", sql.NVarChar(200), data.email)
      .input("Password", sql.NVarChar(200), data.password)
      .input("Role", sql.NVarChar(50), data.role || "user")
      .query(`
        INSERT INTO users (name, email, password, role)
        OUTPUT INSERTED.*
        VALUES (@Name, @Email, @Password, @Role)
      `);
    return result.recordset[0];
  },

  
  update: async (id, data) => {
    await poolConnect;
    const result = await pool
      .request()
      .input("Id", sql.Int, id)
      .input("Name", sql.NVarChar(100), data.name)
      .input("Email", sql.NVarChar(200), data.email)
      .input("Password", sql.NVarChar(200), data.password)
      .input("Role", sql.NVarChar(50), data.role)
      .query(`
        UPDATE users
        SET name = @Name,
            email = @Email,
            password = @Password,
            role = @Role
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
        DELETE FROM users
        WHERE id = @Id
      `);
    return true;
  },
};

module.exports = User;
