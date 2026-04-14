const { sequelize, User, Expense, ExpenseSplit } = require("../models");
const { SplitType } = require("../models/Expense");
const { parseRupeesToPaise, paiseToRupeesString } = require("../utils/money");

async function findOrCreateUsersByName(names) {
  const uniqueNames = [...new Set(names.map((n) => String(n).trim()).filter(Boolean))];
  if (uniqueNames.length === 0) return [];

  const alreadyThere = await User.findAll({ where: { name: uniqueNames } });
  const byName = new Map(alreadyThere.map((u) => [u.name, u]));

  const missing = uniqueNames.filter((n) => !byName.has(n)).map((n) => ({ name: n }));
  const inserted = missing.length ? await User.bulkCreate(missing) : [];

  const combined = [...alreadyThere, ...inserted];
  combined.sort((a, b) => a.id - b.id);
  return combined;
}

function buildEqualSplitRows(participantUsers, totalPaise) {
  const count = BigInt(participantUsers.length);
  const share = totalPaise / count;
  const leftover = totalPaise % count;
  return participantUsers.map((user, index) => {
    const extraPaise = BigInt(index) < leftover ? 1n : 0n;
    return { userId: user.id, amountPaise: share + extraPaise };
  });
}

function buildUnequalSplitRows(participantUsers, splitsInput, totalPaise) {
  if (!splitsInput || typeof splitsInput !== "object") {
    return { error: "splits object is required for UNEQUAL split" };
  }

  const rows = participantUsers.map((user) => {
    const raw = splitsInput[user.name];
    const paise = parseRupeesToPaise(raw);
    if (paise === null || paise < 0n) return null;
    return { userId: user.id, amountPaise: paise };
  });

  if (rows.some((r) => r === null)) {
    return { error: "splits must contain valid non-negative amounts for each participant" };
  }

  const sum = rows.reduce((acc, r) => acc + r.amountPaise, 0n);
  if (sum !== totalPaise) {
    return {
      error: "Unequal split total must match expense total",
      details: {
        expected: paiseToRupeesString(totalPaise),
        actual: paiseToRupeesString(sum),
      },
    };
  }

  return { rows };
}

async function createExpense(input) {
  const { payerName, participantNames, totalAmount, splitType, splits, description } = input;

  if (!payerName || typeof payerName !== "string") {
    return { error: "payerName is required", status: 400 };
  }
  if (!Array.isArray(participantNames) || participantNames.length === 0) {
    return { error: "participantNames must be a non-empty array", status: 400 };
  }
  if (![SplitType.EQUAL, SplitType.UNEQUAL].includes(splitType)) {
    return { error: `splitType must be ${SplitType.EQUAL} or ${SplitType.UNEQUAL}`, status: 400 };
  }

  const totalPaise = parseRupeesToPaise(totalAmount);
  if (totalPaise === null || totalPaise <= 0n) {
    return { error: "totalAmount must be a positive number with up to 2 decimals", status: 400 };
  } 

  const payer = String(payerName).trim();
  const participants = participantNames.map((n) => String(n).trim()).filter(Boolean);
  if (!participants.includes(payer)) {
    return { error: "payer must be included in participants", status: 400 };
  }

  const users = await findOrCreateUsersByName([payer, ...participants]);
  const userByName = new Map(users.map((u) => [u.name, u]));
  const payerRow = userByName.get(payer);
  if (!payerRow) return { error: "Invalid payer", status: 400 };

  const participantUsers = participants.map((n) => userByName.get(n)).filter(Boolean);
  const uniqueParticipantCount = new Set(participants).size;
  if (participantUsers.length !== uniqueParticipantCount) {
    return { error: "Invalid participant(s)", status: 400 };
  }

  let splitRows;
  if (splitType === SplitType.EQUAL) {
    splitRows = buildEqualSplitRows(participantUsers, totalPaise);
  } else {
    const built = buildUnequalSplitRows(participantUsers, splits, totalPaise);
    if (built.error) return { error: built.error, details: built.details, status: 400 };
    splitRows = built.rows;
  }

  const txn = await sequelize.transaction();
  try {
    const expense = await Expense.create(
      {
        description: description ? String(description).slice(0, 255) : null,
        payerId: payerRow.id,
        totalAmountPaise: totalPaise.toString(),
        splitType,
      },
      { transaction: txn }
    );

    await ExpenseSplit.bulkCreate(
      splitRows.map((r) => ({
        expenseId: expense.id,
        userId: r.userId,
        amountPaise: r.amountPaise.toString(),
      })),
      { transaction: txn }
    );

    await txn.commit();
    return { ok: true, expenseId: expense.id };
  } catch (e) {
    await txn.rollback();
    return { error: "Failed to create expense", status: 500 };
  }
}

function clampInt(value, { min, max, fallback }) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  const i = Math.trunc(n);
  if (i < min) return min;
  if (i > max) return max;
  return i;
}

async function listExpenses({ offset = 0, limit = 10 } = {}) {
  const safeLimit = clampInt(limit, { min: 1, max: 100, fallback: 10 });
  const safeOffset = clampInt(offset, { min: 0, max: Number.MAX_SAFE_INTEGER, fallback: 0 });
  const safePage = Math.floor(safeOffset / safeLimit) + 1;

  const { rows, count } = await Expense.findAndCountAll({
    order: [["id", "DESC"]],
    limit: safeLimit,
    offset: safeOffset,
    distinct: true,
    include: [
      { model: User, as: "payer", attributes: ["id", "name"] },
      {
        model: ExpenseSplit,
        as: "splits",
        separate: true,
        include: [{ model: User, as: "user", attributes: ["id", "name"] }],
      },
    ],
  });

  const items = rows.map((expense) => ({
    id: expense.id,
    description: expense.description,
    payer: expense.payer?.name,
    totalAmount: paiseToRupeesString(expense.totalAmountPaise),
    splitType: expense.splitType,
    participants: (expense.splits ?? []).map((s) => ({
      name: s.user?.name,
      amount: paiseToRupeesString(s.amountPaise),
    })),
    createdAt: expense.createdAt,
  }));

  const total = typeof count === "number" ? count : Array.isArray(count) ? count.length : 0;
  const totalPages = total === 0 ? 1 : Math.ceil(total / safeLimit);

  return {
    items,
    offset: safeOffset,
    page: safePage,
    limit: safeLimit,
    total,
    totalPages,
  };
}

async function deleteExpenseById(expenseId) {
  const deleted = await Expense.destroy({ where: { id: expenseId } });
  return deleted > 0;
}

module.exports = { createExpense, listExpenses, deleteExpenseById };

