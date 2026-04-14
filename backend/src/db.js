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

const host = MYSQLHOST || DB_HOST || "localhost";
const port = Number(MYSQLPORT || DB_PORT || "3306");
const database = MYSQLDATABASE || DB_NAME || "smart_expernse";
const username = MYSQLUSER || DB_USER || "root";
const password = MYSQLPASSWORD || DB_PASSWORD || "";

const sequelize = new Sequelize(database, username, password, {
  host,
  port,
  dialect: "mysql",
  logging: false,
  define: { underscored: true },
});

module.exports = { sequelize };
