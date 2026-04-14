const express = require("express");
const { User } = require("../models");
const { computeBalancesAndSettlements } = require("../services/balances");
const { paiseToRupeesString } = require("../utils/money");

const router = express.Router();

router.get("/balances", async (req, res) => {
  const { users, netByUserId, settlements } = await computeBalancesAndSettlements();
  const userNameById = new Map(users.map((u) => [u.id, u.name]));

  const net = users
    .map((u) => ({ userId: u.id, name: u.name, netAmount: paiseToRupeesString(netByUserId[u.id] ?? 0n) }))
    .filter((x) => x.netAmount !== "0.00" && x.netAmount !== "-0.00");

  const owes = settlements.map((t) => ({
    from: userNameById.get(t.fromUserId),
    to: userNameById.get(t.toUserId),
    amount: paiseToRupeesString(t.amountPaise),
    text: `${userNameById.get(t.fromUserId)} owes ${userNameById.get(t.toUserId)} ₹${paiseToRupeesString(t.amountPaise)}`,
  }));

  res.json({ net, owes });
});

router.get("/settlements", async (req, res) => {
  const { users, netByUserId, settlements } = await computeBalancesAndSettlements();
  const userNameById = new Map(users.map((u) => [u.id, u.name]));

  res.json({
    settlements: settlements.map((t) => ({
      fromUserId: t.fromUserId,
      from: userNameById.get(t.fromUserId),
      toUserId: t.toUserId,
      to: userNameById.get(t.toUserId),
      amount: paiseToRupeesString(t.amountPaise),
    })),
    net: users.map((u) => ({
      userId: u.id,
      name: u.name,
      netAmount: paiseToRupeesString(netByUserId[u.id] ?? 0n),
    })),
  });
});

router.get("/users", async (req, res) => {
  const users = await User.findAll({ attributes: ["id", "name"], order: [["name", "ASC"]] });
  res.json(users);
});

module.exports = { summaryRouter: router };

