require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { sequelize } = require("./models");
const { connectWithRetry } = require("./db");
const { expensesRouter } = require("./routes/expenses");
const { summaryRouter } = require("./routes/summary");

const PORT = Number(process.env.PORT || 4000);
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "https://smart-expense-sharer.vercel.app";

async function main() {
  // 1. Establish connection with the database
  await connectWithRetry();

  try {
    // 2. Sync Models (Creates tables in Railway MySQL if they don't exist)
    await sequelize.sync({ alter: false });
    console.log("[db] Database tables synced successfully.");

    const [rows] = await sequelize.query("SELECT DATABASE() AS currentDb");
    const currentDb = Array.isArray(rows) && rows[0] ? rows[0].currentDb : null;
    console.log("Connected DB:", currentDb);
  } catch (e) {
    console.error("[db] Error during sync or query:", e.message);
  }

  const app = express();
  
  // 3. Robust CORS Configuration
  app.use(cors({ 
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);
      
      const allowedOrigins = [
        FRONTEND_ORIGIN,
        "https://smart-expense-sharer.vercel.app",
        "http://localhost:5173"
      ];

      // Check if the origin starts with our expected domain (handles trailing slashes)
      const isAllowed = allowedOrigins.some(allowed => origin.startsWith(allowed));

      if (isAllowed) {
        callback(null, true);
      } else {
        console.warn(`[CORS] Blocked request from origin: ${origin}`);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  }));

  app.use(express.json({ limit: "1mb" }));

  // Health check
  app.get("/health", (req, res) => res.json({ ok: true }));

  // Debug endpoints
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
        username: cfg.username,
      },
    });
  });

  // Routes
  app.use("/api/expenses", expensesRouter);
  app.use("/api", summaryRouter);

  // Global Error Handler
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: "Unexpected server error" });
  });

  // Start Server on 0.0.0.0 for Docker/Railway compatibility
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Backend listening on port ${PORT}`);
    console.log(`CORS allowed for: ${FRONTEND_ORIGIN}`);
  });
}

main().catch((e) => {
  console.error("Critical failure during startup:", e);
  process.exit(1);
});