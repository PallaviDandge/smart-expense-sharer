const { Sequelize } = require("sequelize");

const {
  DB_HOST = "localhost",
  DB_PORT = "3306",
  DB_NAME = "smart_expernse",
  DB_USER = "root",
  DB_PASSWORD = "",
} = process.env;

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  port: Number(DB_PORT),
  dialect: "mysql",
  logging: false,
  define: { underscored: true },
});

module.exports = { sequelize };

