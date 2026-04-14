const { DataTypes } = require("sequelize");

function initExpenseSplitModel(sequelize) {
  const ExpenseSplit = sequelize.define(
    "ExpenseSplit",
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      expenseId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, field: "expense_id" },
      userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, field: "user_id" },
      amountPaise: { type: DataTypes.BIGINT, allowNull: false, field: "amount_paise" },
    },
    {
      tableName: "expense_splits",
      indexes: [{ unique: true, fields: ["expense_id", "user_id"] }],
    }
  );

  return ExpenseSplit;
}

module.exports = { initExpenseSplitModel };

