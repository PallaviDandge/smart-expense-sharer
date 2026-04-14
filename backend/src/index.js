require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { sequelize } = require("./models");
const { expensesRouter } = require("./routes/expenses");
const { summaryRouter } = require("./routes/summary");

const PORT = Number(process.env.PORT || 4000);
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:5173";

async function main() {
  await sequelize.authenticate();
  try {
    const [rows] = await sequelize.query("SELECT DATABASE() AS currentDb");
    const currentDb = Array.isArray(rows) && rows[0] ? rows[0].currentDb : null;
    console.log("Connected DB:", currentDb);
  } catch (e) {
    console.log("Connected DB: (unable to query)");
  }

  const app = express();
  app.use(cors({ origin: FRONTEND_ORIGIN }));
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (req, res) => res.json({ ok: true }));
  app.get("/api/debug/db", (req, res) => {
    const cfg = sequelize?.config ?? {};
    res.json({
      env: {
        DB_HOST: process.env.DB_HOST,
        DB_PORT: process.env.DB_PORT,
        DB_NAME: process.env.DB_NAME,
        DB_USER: process.env.DB_USER,
      },
      sequelize: {
        database: cfg.database,
        host: cfg.host,
        port: cfg.port,
        username: cfg.username,
        dialect: cfg.dialect,
      },
    });
  });
  app.get("/api/debug/current-db", async (req, res) => {
    const [rows] = await sequelize.query("SELECT DATABASE() AS currentDb");
    res.json({ currentDb: rows?.[0]?.currentDb ?? null });
  });
  app.get("/api/debug/mysql-info", async (req, res) => {
    const [rows] = await sequelize.query(`
      SELECT
        DATABASE() AS currentDb,
        @@version AS version,
        @@version_comment AS versionComment,
        @@port AS port,
        @@hostname AS hostname,
        @@datadir AS datadir,
        USER() AS user
    `);
    res.json(rows?.[0] ?? {});
  });
  app.use("/api/expenses", expensesRouter);
  app.use("/api", summaryRouter);

  app.use((err, req, res, next) => {
    // eslint-disable-next-line no-unused-vars
    console.error(err);
    res.status(500).json({ error: "Unexpected server error" });
  });

  app.listen(PORT, () => {
    console.log(`Backend listening on http://localhost:${PORT}`);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

