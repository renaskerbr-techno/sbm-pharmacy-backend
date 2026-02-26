const bcrypt = require("bcryptjs");

async function run() {

  const password = "admin123456"; // your login password

  const hash = await bcrypt.hash(password, 10);

  console.log(hash);

}

run();
