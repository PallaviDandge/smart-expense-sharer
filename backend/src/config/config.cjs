require("dotenv").config();

function envInt(name, fallback) {
  const v = process.env[name];
  if (v == null || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function makeCfg() {
  return {
    username: process.env.MYSQLUSER || process.env.DB_USER,
    password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD,
    database: process.env.MYSQLDATABASE || process.env.DB_NAME,
    host: process.env.MYSQLHOST || process.env.DB_HOST,
    port: envInt("MYSQLPORT", envInt("DB_PORT", 3306)),
    dialect: "mysql",
    logging: false,
  };
}

module.exports = {
  development: makeCfg(),
  production: makeCfg(),
};
