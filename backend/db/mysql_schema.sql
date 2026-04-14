-- Smart Expense Sharing (MySQL)
-- Database: smart_expernse

CREATE DATABASE IF NOT EXISTS smart_expernse;
USE smart_expernse;

-- Users (we auto-create users by name on expense creation)
CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Expenses
CREATE TABLE IF NOT EXISTS expenses (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  description VARCHAR(255) NULL,
  payer_id INT UNSIGNED NOT NULL,
  total_amount_paise BIGINT NOT NULL,
  split_type ENUM('EQUAL','UNEQUAL') NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_expenses_payer_id (payer_id),
  CONSTRAINT fk_expenses_payer_id
    FOREIGN KEY (payer_id) REFERENCES users(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Expense splits (one row per participant per expense)
CREATE TABLE IF NOT EXISTS expense_splits (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  expense_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  amount_paise BIGINT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_expense_splits_expense_user (expense_id, user_id),
  KEY idx_expense_splits_user_id (user_id),
  CONSTRAINT fk_expense_splits_expense_id
    FOREIGN KEY (expense_id) REFERENCES expenses(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_expense_splits_user_id
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

