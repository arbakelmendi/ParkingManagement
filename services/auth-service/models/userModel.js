// services/auth-service/models/userModel.js
const { sql, pool, poolConnect } = require("../config/db");

const User = {
  // mos e kthe password_hash
  getAll: async () => {
    await poolConnect;
    const result = await pool.request().query(`
      SELECT id, name, email, role
      FROM dbo.users
      ORDER BY id ASC
    `);
    return result.recordset;
  },

  // mos e kthe password_hash
  getById: async (id) => {
    await poolConnect;
    const result = await pool
      .request()
      .input("Id", sql.Int, id)
      .query(`
        SELECT id, name, email, role
        FROM dbo.users
        WHERE id = @Id
      `);
    return result.recordset[0] || null;
  },

  // ✅ për login (DUHET me kthy password_hash)
  findByEmail: async (email) => {
    await poolConnect;
    const result = await pool
      .request()
      .input("Email", sql.NVarChar(200), email)
      .query(`
        SELECT id, name, email, password_hash, role
        FROM dbo.users
        WHERE email = @Email
      `);
    return result.recordset[0] || null;
  },

  // ✅ create me password_hash
  create: async (data) => {
    await poolConnect;

    const result = await pool
      .request()
      .input("Name", sql.NVarChar(100), data.name)
      .input("Email", sql.NVarChar(200), data.email)
      .input("PasswordHash", sql.NVarChar(255), data.password_hash) // bcrypt hash
      .input("Role", sql.NVarChar(50), data.role || "user")
      .query(`
        INSERT INTO dbo.users (name, email, password_hash, role)
        OUTPUT INSERTED.id, INSERTED.name, INSERTED.email, INSERTED.role
        VALUES (@Name, @Email, @PasswordHash, @Role)
      `);

    return result.recordset[0];
  },

  // ✅ update (opsionale) – nëse s’e ndërron pass, mos e dërgo fare
  update: async (id, data) => {
    await poolConnect;

    const hasPassword = typeof data.password_hash === "string" && data.password_hash.length > 0;

    const request = pool
      .request()
      .input("Id", sql.Int, id)
      .input("Name", sql.NVarChar(100), data.name)
      .input("Email", sql.NVarChar(200), data.email)
      .input("Role", sql.NVarChar(50), data.role);

    if (hasPassword) {
      request.input("PasswordHash", sql.NVarChar(255), data.password_hash);
    }

    const result = await request.query(`
      UPDATE dbo.users
      SET name = @Name,
          email = @Email,
          role = @Role
          ${hasPassword ? ", password_hash = @PasswordHash" : ""}
      OUTPUT INSERTED.id, INSERTED.name, INSERTED.email, INSERTED.role
      WHERE id = @Id
    `);

    return result.recordset[0] || null;
  },

  delete: async (id) => {
    await poolConnect;
    await pool.request().input("Id", sql.Int, id).query(`
      DELETE FROM dbo.users WHERE id = @Id
    `);
    return true;
  },
};

module.exports = User;
