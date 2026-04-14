const { createExpense, listExpenses, deleteExpenseById } = require("../services/expensesService");

function sendError(res, status, message, details) {
  return res.status(status).json({ error: message, details });
}

async function createExpenseHandler(req, res) {
  const result = await createExpense(req.body ?? {});
  if (!result.ok) {
    return sendError(res, result.status || 500, result.error || "Unexpected error", result.details);
  }
  return res.status(201).json({ id: result.expenseId });
}

async function listExpensesHandler(req, res) {
  const offset = req.query?.offset;
  const limit = req.query?.limit;
  const payload = await listExpenses({ offset, limit });
  return res.json(payload);
}

async function deleteExpenseHandler(req, res) {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) return sendError(res, 400, "Invalid expense id");

  const deleted = await deleteExpenseById(id);
  if (!deleted) return sendError(res, 404, "Expense not found");
  return res.json({ ok: true });
}

module.exports = { createExpenseHandler, listExpensesHandler, deleteExpenseHandler };
