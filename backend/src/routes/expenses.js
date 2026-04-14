const express = require("express");
const {
  createExpenseHandler,
  listExpensesHandler,
  deleteExpenseHandler,
} = require("../controllers/expensesController");

const router = express.Router();

router.post("/", createExpenseHandler);
router.get("/", listExpensesHandler);
router.delete("/:id", deleteExpenseHandler);

module.exports = { expensesRouter: router };
