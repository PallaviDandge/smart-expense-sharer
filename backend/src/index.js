require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { sequelize } = require("./models");
const { connectWithRetry } = require("./db");
const { expensesRouter } = require("./routes/expenses");
const { summaryRouter } = require("./routes/summary");

const PORT = Number(process.env.PORT || 4000);
// Ensure this matches your Vercel URL in the Railway Variables tab
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "https://smart-expense-sharer.vercel.app";

async function main() {
  // 1. Establish connection with the database using the retry logic
  await connectWithRetry();

  try {
    // 2. Automatically create/sync tables based on your Sequelize models
    // This is what adds the tables to your empty Railway MySQL instance
    await sequelize.sync({ alter: false }); 
    console.log("[db] Database tables synced successfully.");

    // 3. Debug: Verify which database we are actually connected to
    const [rows] = await sequelize.query("SELECT DATABASE() AS currentDb");
    const currentDb = Array.isArray(rows) && rows[0] ? rows[0].currentDb : null;
    console.log("Connected DB Name:", currentDb);
  } catch (e) {
    console.error("[db] Error during sync or initial query:", e.message);
  }

  const app = express();
  
  // CORS configuration to allow your Vercel frontend to communicate with this backend
  app.use(cors({ 
    origin: FRONTEND_ORIGIN,
    credentials: true 
  }));
  
  app.use(express.json({ limit: "1mb" }));

  // Health check for Railway deployment monitoring
  app.get("/health", (req, res) => res.json({ ok: true }));

  // Debug endpoints (useful for verifying Railway env variables)
  app.get("/api/debug/db", (req, res) => {
    const cfg = sequelize?.config ?? {};
    res.json({
      env: {
        MYSQLHOST: process.env.MYSQLHOST,
        MYSQLDATABASE: process.env.MYSQLDATABASE,
        FRONTEND_ORIGIN: process.env.FRONTEND_ORIGIN,
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

  // API Routes
  app.use("/api/expenses", expensesRouter);
  app.use("/api", summaryRouter);

  // Global Error Handler
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: "Unexpected server error" });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Backend listening on port ${PORT}`);
    console.log(`CORS allowed for: ${FRONTEND_ORIGIN}`);
  });
}

main().catch((e) => {
  console.error("Critical failure during startup:", e);
  process.exit(1);
});