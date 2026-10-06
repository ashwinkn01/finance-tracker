-- Finance Tracker database schema (MySQL 8+)
-- The app does not create its own tables (spring.jpa.hibernate.ddl-auto=none),
-- so run this once before starting the backend:
--     mysql -u root -p < database/schema.sql

CREATE DATABASE IF NOT EXISTS finance_tracker CHARACTER SET utf8mb4;
USE finance_tracker;

CREATE TABLE IF NOT EXISTS users (
  id         BIGINT       NOT NULL AUTO_INCREMENT,
  username   VARCHAR(50)  NOT NULL,
  email      VARCHAR(100) NOT NULL,
  password   VARCHAR(255) NOT NULL,           -- BCrypt hash (60 chars), never plain text
  created_at TIMESTAMP    NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY username (username),
  UNIQUE KEY email (email)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS categories (
  id      BIGINT      NOT NULL AUTO_INCREMENT,
  name    VARCHAR(50) NOT NULL,
  type    ENUM('INCOME','EXPENSE') NOT NULL,
  user_id BIGINT      NOT NULL,
  PRIMARY KEY (id),
  KEY user_id (user_id),
  CONSTRAINT categories_ibfk_1 FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS transactions (
  id          BIGINT         NOT NULL AUTO_INCREMENT,
  user_id     BIGINT         NOT NULL,
  category_id BIGINT         NOT NULL,
  amount      DECIMAL(12,2)  NOT NULL,
  type        ENUM('INCOME','EXPENSE') NOT NULL,
  txn_date    DATE           NOT NULL,
  txn_time    TIME           NOT NULL,
  note        VARCHAR(255)   DEFAULT NULL,
  created_at  TIMESTAMP      NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY user_id (user_id),
  KEY category_id (category_id),
  CONSTRAINT transactions_ibfk_1 FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT transactions_ibfk_2 FOREIGN KEY (category_id) REFERENCES categories (id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS budgets (
  id           BIGINT        NOT NULL AUTO_INCREMENT,
  user_id      BIGINT        NOT NULL,
  category_id  BIGINT        NOT NULL,
  month_year   VARCHAR(7)    NOT NULL,        -- "YYYY-MM"
  limit_amount DECIMAL(12,2) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_budget (user_id, category_id, month_year),
  KEY category_id (category_id),
  CONSTRAINT budgets_ibfk_1 FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT budgets_ibfk_2 FOREIGN KEY (category_id) REFERENCES categories (id)
) ENGINE=InnoDB;
