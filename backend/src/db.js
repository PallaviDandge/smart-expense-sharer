const { Sequelize } = require("sequelize");

const {
  MYSQLHOST,
  MYSQLPORT,
  MYSQLDATABASE,
  MYSQLUSER,
  MYSQLPASSWORD,
  DB_HOST,
  DB_PORT,
  DB_NAME,
  DB_USER,
  DB_PASSWORD,
} = process.env;

function requireEnv(value, name) {
  if (value == null || value === "") {
    throw new Error(`Missing database environment variable: ${name}`);
  }

  return value;
}

const host = requireEnv(MYSQLHOST || DB_HOST, "DB_HOST");
const port = Number(requireEnv(MYSQLPORT || DB_PORT, "DB_PORT"));
const database = requireEnv(MYSQLDATABASE || DB_NAME, "DB_NAME");
const username = requireEnv(MYSQLUSER || DB_USER, "DB_USER");
const password = requireEnv(MYSQLPASSWORD || DB_PASSWORD, "DB_PASSWORD");

const sequelize = new Sequelize(database, username, password, {
  host,
  port,
  dialect: "mysql",
  logging: false,
  define: { underscored: true },
});

const RETRYABLE_CODES = new Set(["ECONNREFUSED", "ENOTFOUND"]);
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
      const isRetryable = RETRYABLE_CODES.has(code);

      if (!isRetryable || attempt === MAX_RETRIES) {
        console.error(
          `[db] Connection failed on attempt ${attempt} with error: ${err.message}`
        );
        throw err;
      }

      console.warn(
        `[db] Attempt ${attempt} failed (${code}). Retrying in ${delay / 1000}s...`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
}

module.exports = { sequelize, connectWithRetry };
