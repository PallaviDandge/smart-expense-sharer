const { Sequelize } = require("sequelize");

const {
  MYSQLHOST,
  MYSQLPORT,
  MYSQLDATABASE,
  MYSQLUSER,
  MYSQLPASSWORD,
} = process.env;

const sequelize = new Sequelize(
  MYSQLDATABASE,
  MYSQLUSER,
  MYSQLPASSWORD,
  {
    host: MYSQLHOST,
    port: Number(MYSQLPORT),
    dialect: "mysql",
    logging: false,
    define: { underscored: true },
  }
);

const RETRYABLE_CODES = new Set(["ECONNREFUSED", "ENOTFOUND", "ETIMEDOUT"]);
const MAX_RETRIES = 10;

async function connectWithRetry() {
  let delay = 1000;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[db] Connection attempt ${attempt}/${MAX_RETRIES}...`);
      await sequelize.authenticate();
      console.log("[db] MySQL connection established successfully.");
      return;
    } catch (err) {
      const code = err.original?.code ?? err.code;
      if (!RETRYABLE_CODES.has(code) || attempt === MAX_RETRIES) {
        throw err;
      }
      console.warn(`[db] Attempt ${attempt} failed. Retrying in ${delay / 1000}s...`);
      await new Promise((res) => setTimeout(res, delay));
      delay *= 2;
    }
  }
}

module.exports = { sequelize, connectWithRetry };