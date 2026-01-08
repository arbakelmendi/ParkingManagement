const bcrypt = require("bcrypt");

(async () => {
  const plain = process.argv[2];
  if (!plain) {
    console.log("Usage: node scripts/hashPassword.js YourPassword123!");
    process.exit(1);
  }
  const hash = await bcrypt.hash(plain, 10);
  console.log(hash);
})();
