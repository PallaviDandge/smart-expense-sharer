require("dotenv").config();

function envInt(name, fallback) {
  const v = process.env[name];
  if (v == null || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function makeCfg() {
  return {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: envInt("DB_PORT", 3306),
    dialect: "mysql",
    logging: false,
  };
}

module.exports = {
  development: makeCfg(),
  production: makeCfg(),
};

