const { Expense, ExpenseSplit, User } = require("../models");
const { optimizeSettlementsFromNet } = require("./settlement");

async function computeNetBalancesPaise() {
  const users = await User.findAll({ attributes: ["id", "name"], raw: true });
  const net = Object.fromEntries(users.map((u) => [u.id, 0n]));

  const expensesPaid = await Expense.findAll({
    attributes: ["payerId", "totalAmountPaise"],
    raw: true,
  });
  for (const e of expensesPaid) {
    net[e.payerId] = (net[e.payerId] ?? 0n) + BigInt(e.totalAmountPaise);
  }

  const splits = await ExpenseSplit.findAll({
    attributes: ["userId", "amountPaise"],
    raw: true,
  });
  for (const s of splits) {
    net[s.userId] = (net[s.userId] ?? 0n) - BigInt(s.amountPaise);
  }

  return { users, netByUserId: net };
}

async function computeBalancesAndSettlements() {
  const { users, netByUserId } = await computeNetBalancesPaise();
  const settlements = optimizeSettlementsFromNet(netByUserId);
  return { users, netByUserId, settlements };
}

module.exports = { computeNetBalancesPaise, computeBalancesAndSettlements };

