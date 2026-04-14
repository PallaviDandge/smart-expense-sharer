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

module.exports = { sequelize };
