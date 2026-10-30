import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, '../../fraud_guard.db');

// Initialize database
export const db = new DatabaseSync(dbPath);

export function initializeDatabase() {
  db.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      risk_segment TEXT DEFAULT 'STANDARD',
      avg_transaction_amount REAL DEFAULT 150.0,
      monthly_volume_limit REAL DEFAULT 10000.0,
      primary_city TEXT DEFAULT 'New York',
      primary_country TEXT DEFAULT 'US',
      primary_lat REAL DEFAULT 40.7128,
      primary_lng REAL DEFAULT -74.0060,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      account_number TEXT NOT NULL UNIQUE,
      account_type TEXT NOT NULL DEFAULT 'CHECKING',
      balance REAL NOT NULL DEFAULT 5000.0,
      currency TEXT NOT NULL DEFAULT 'USD',
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      last_active_at TEXT,
      is_dormant INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    );

    CREATE TABLE IF NOT EXISTS rules (
      code TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      weight INTEGER NOT NULL,
      threshold REAL,
      time_window_seconds INTEGER,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL,
      customer_id TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'USD',
      merchant_name TEXT NOT NULL,
      merchant_category TEXT NOT NULL,
      channel TEXT NOT NULL DEFAULT 'ONLINE',
      location_city TEXT NOT NULL,
      location_country TEXT NOT NULL,
      latitude REAL,
      longitude REAL,
      ip_address TEXT,
      device_id TEXT,
      device_os TEXT,
      is_trusted_device INTEGER DEFAULT 1,
      risk_score INTEGER NOT NULL DEFAULT 0,
      risk_level TEXT NOT NULL DEFAULT 'LOW',
      status TEXT NOT NULL DEFAULT 'APPROVED',
      triggered_rules_json TEXT,
      explainability_summary TEXT,
      timestamp TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (account_id) REFERENCES accounts(id)
    );

    CREATE TABLE IF NOT EXISTS investigations (
      id TEXT PRIMARY KEY,
      transaction_id TEXT NOT NULL UNIQUE,
      customer_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      priority TEXT NOT NULL DEFAULT 'HIGH',
      assigned_analyst TEXT DEFAULT 'Unassigned',
      analyst_notes TEXT DEFAULT '',
      resolution_reason TEXT DEFAULT '',
      resolved_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (transaction_id) REFERENCES transactions(id),
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      transaction_id TEXT,
      investigation_id TEXT,
      actor TEXT NOT NULL,
      action TEXT NOT NULL,
      details TEXT NOT NULL,
      timestamp TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS customer_notifications (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      transaction_id TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'SMS',
      phone_or_email TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'SENT',
      sent_at TEXT NOT NULL,
      responded_at TEXT,
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (transaction_id) REFERENCES transactions(id)
    );

    CREATE INDEX IF NOT EXISTS idx_transactions_customer ON transactions(customer_id, timestamp);
    CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id, timestamp);
    CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
    CREATE INDEX IF NOT EXISTS idx_investigations_status ON investigations(status);
    CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);
  `);
}

export default db;
