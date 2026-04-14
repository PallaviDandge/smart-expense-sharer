const { sequelize } = require("../db");
const { initUserModel } = require("./User");
const { initExpenseModel } = require("./Expense");
const { initExpenseSplitModel } = require("./ExpenseSplit");

const User = initUserModel(sequelize);
const Expense = initExpenseModel(sequelize);
const ExpenseSplit = initExpenseSplitModel(sequelize);

Expense.belongsTo(User, { as: "payer", foreignKey: "payerId" });
User.hasMany(Expense, { as: "paidExpenses", foreignKey: "payerId" });

Expense.hasMany(ExpenseSplit, { as: "splits", foreignKey: "expenseId", onDelete: "CASCADE" });
ExpenseSplit.belongsTo(Expense, { as: "expense", foreignKey: "expenseId" });

ExpenseSplit.belongsTo(User, { as: "user", foreignKey: "userId" });
User.hasMany(ExpenseSplit, { as: "splits", foreignKey: "userId" });

module.exports = { sequelize, User, Expense, ExpenseSplit };

