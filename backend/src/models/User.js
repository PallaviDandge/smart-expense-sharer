const { DataTypes } = require("sequelize");

function initUserModel(sequelize) {
  const User = sequelize.define(
    "User",
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      name: { type: DataTypes.STRING(120), allowNull: false, unique: true },
    },
    { tableName: "users" }
  );

  return User;
}

module.exports = { initUserModel };

