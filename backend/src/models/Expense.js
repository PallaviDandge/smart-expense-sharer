const { DataTypes } = require("sequelize");

const SplitType = {
  EQUAL: "EQUAL",
  UNEQUAL: "UNEQUAL",
};

function initExpenseModel(sequelize) {
  const Expense = sequelize.define(
    "Expense",
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      description: { type: DataTypes.STRING(255), allowNull: true },
      payerId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, field: "payer_id" },
      totalAmountPaise: {
        type: DataTypes.BIGINT,
        allowNull: false,
        field: "total_amount_paise",
      },
      splitType: {
        type: DataTypes.ENUM(SplitType.EQUAL, SplitType.UNEQUAL),
        allowNull: false,
        field: "split_type",
      },
    },
    { tableName: "expenses" }
  );

  return Expense;
}

module.exports = { initExpenseModel, SplitType };

