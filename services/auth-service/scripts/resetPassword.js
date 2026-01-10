const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const bcrypt = require("bcrypt");
const { sql, pool, poolConnect } = require("../config/db");

(async () => {
  const [email, plain] = process.argv.slice(2);
  if (!email || !plain) {
    console.log("Usage: node scripts/resetPassword.js email@example.com NewPassword123!");
    process.exit(1);
  }

  await poolConnect;
  const passwordHash = await bcrypt.hash(plain, 10);

  const result = await pool
    .request()
    .input("Email", sql.NVarChar(200), email)
    .input("PasswordHash", sql.NVarChar(255), passwordHash)
    .query(`
      UPDATE dbo.users
      SET password_hash = @PasswordHash
      WHERE email = @Email
    `);

  if (result.rowsAffected[0] === 0) {
    console.log(`No user found for email: ${email}`);
    process.exit(1);
  }

  console.log(`Password updated for ${email}`);
  process.exit(0);
})().catch((err) => {
  console.error("Reset password failed:", err);
  process.exit(1);
});
