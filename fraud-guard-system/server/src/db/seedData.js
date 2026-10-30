import { db } from './database.js';
import { v4 as uuidv4 } from 'uuid';

export function seedInitialData() {
  // Check if customers already exist
  const existingCustomers = db.prepare('SELECT COUNT(*) as count FROM customers').get();
  if (existingCustomers && existingCustomers.count > 0) {
    return; // Already seeded
  }

  const now = new Date();
  const isoNow = now.toISOString();

  // 1. Seed Rules
  const insertRule = db.prepare(`
    INSERT INTO rules (code, name, description, category, weight, threshold, time_window_seconds, enabled, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const initialRules = [
    {
      code: 'VELOCITY_SPIKE',
      name: 'High Transaction Velocity',
      description: 'More than 3 transactions detected within a 2-minute rolling window for the same account.',
      category: 'VELOCITY',
      weight: 35,
      threshold: 3,
      time_window_seconds: 120,
      enabled: 1
    },
    {
      code: 'AMOUNT_ANOMALY',
      name: 'Unusual Amount Deviation',
      description: 'Transaction amount exceeds 3.5x customer historical average or exceeds $5,000 threshold.',
      category: 'AMOUNT',
      weight: 30,
      threshold: 3.5,
      time_window_seconds: 0,
      enabled: 1
    },
    {
      code: 'GEO_IMPOSSIBLE',
      name: 'Impossible Travel / Teleportation',
      description: 'Location distance between consecutive transactions implies physical travel speed exceeding 900 km/h.',
      category: 'GEOGRAPHY',
      weight: 45,
      threshold: 900,
      time_window_seconds: 7200,
      enabled: 1
    },
    {
      code: 'HIGH_RISK_CATEGORY',
      name: 'High-Risk Merchant Category',
      description: 'Transaction involves high-risk sectors such as offshore crypto exchanges, darknet, or unregulated gambling.',
      category: 'BEHAVIORAL',
      weight: 25,
      threshold: 0,
      time_window_seconds: 0,
      enabled: 1
    },
    {
      code: 'DORMANT_BURST',
      name: 'Dormant Account High-Value Activation',
      description: 'Sudden high-value transfer (> $1,000) on an account inactive for 30 or more days.',
      category: 'BEHAVIORAL',
      weight: 35,
      threshold: 1000,
      time_window_seconds: 2592000, // 30 days
      enabled: 1
    },
    {
      code: 'ODD_HOURS',
      name: 'Off-Hours High-Risk Activity',
      description: 'High-value transaction initiated between 1:00 AM and 4:30 AM local time.',
      category: 'BEHAVIORAL',
      weight: 15,
      threshold: 500,
      time_window_seconds: 0,
      enabled: 1
    },
    {
      code: 'DEVICE_MISMATCH',
      name: 'Untrusted Device or Suspicious IP',
      description: 'Transaction from an unrecognized device ID or known VPN/proxy IP address.',
      category: 'DEVICE',
      weight: 20,
      threshold: 0,
      time_window_seconds: 0,
      enabled: 1
    },
    {
      code: 'CARD_TESTING',
      name: 'Card Testing Micro-Charges',
      description: 'Multiple rapid small charges ($0.50 - $4.00) indicative of automated fraud credential testing.',
      category: 'VELOCITY',
      weight: 30,
      threshold: 3,
      time_window_seconds: 60,
      enabled: 1
    }
  ];

  for (const r of initialRules) {
    insertRule.run(r.code, r.name, r.description, r.category, r.weight, r.threshold, r.time_window_seconds, r.enabled, isoNow);
  }

  // 2. Seed Customers
  const insertCustomer = db.prepare(`
    INSERT INTO customers (id, name, email, phone, status, risk_segment, avg_transaction_amount, monthly_volume_limit, primary_city, primary_country, primary_lat, primary_lng, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const customers = [
    {
      id: 'CUST-1001',
      name: 'Alice Walker',
      email: 'alice.walker@example.com',
      phone: '+1 (555) 234-8901',
      status: 'ACTIVE',
      risk_segment: 'STANDARD',
      avg_transaction_amount: 85.50,
      monthly_volume_limit: 8000.0,
      primary_city: 'New York',
      primary_country: 'US',
      primary_lat: 40.7128,
      primary_lng: -74.0060,
    },
    {
      id: 'CUST-1002',
      name: 'Bob Martinez',
      email: 'bob.martinez@enterprise.com',
      phone: '+1 (555) 789-1234',
      status: 'ACTIVE',
      risk_segment: 'HIGH_NET_WORTH',
      avg_transaction_amount: 520.00,
      monthly_volume_limit: 35000.0,
      primary_city: 'Chicago',
      primary_country: 'US',
      primary_lat: 41.8781,
      primary_lng: -87.6298,
    },
    {
      id: 'CUST-1003',
      name: 'Catherine Zhang',
      email: 'catherine.z@techpulse.io',
      phone: '+1 (555) 432-8765',
      status: 'ACTIVE',
      risk_segment: 'HIGH_NET_WORTH',
      avg_transaction_amount: 1150.00,
      monthly_volume_limit: 50000.0,
      primary_city: 'San Francisco',
      primary_country: 'US',
      primary_lat: 37.7749,
      primary_lng: -122.4194,
    },
    {
      id: 'CUST-1004',
      name: 'David Miller',
      email: 'd.miller1952@homemail.org',
      phone: '+1 (555) 901-4455',
      status: 'ACTIVE',
      risk_segment: 'STANDARD',
      avg_transaction_amount: 62.00,
      monthly_volume_limit: 5000.0,
      primary_city: 'Miami',
      primary_country: 'US',
      primary_lat: 25.7617,
      primary_lng: -80.1918,
    },
    {
      id: 'CUST-1005',
      name: 'Elena Rostova',
      email: 'elena.rostova@globaladvisory.co.uk',
      phone: '+44 20 7946 0912',
      status: 'ACTIVE',
      risk_segment: 'STANDARD',
      avg_transaction_amount: 320.00,
      monthly_volume_limit: 20000.0,
      primary_city: 'London',
      primary_country: 'GB',
      primary_lat: 51.5074,
      primary_lng: -0.1278,
    },
    {
      id: 'CUST-1006',
      name: 'Frank Thorne',
      email: 'f.thorne@university.edu',
      phone: '+1 (555) 678-3412',
      status: 'ACTIVE',
      risk_segment: 'LOW_RISK',
      avg_transaction_amount: 34.00,
      monthly_volume_limit: 3000.0,
      primary_city: 'Austin',
      primary_country: 'US',
      primary_lat: 30.2672,
      primary_lng: -97.7431,
    }
  ];

  for (const c of customers) {
    insertCustomer.run(
      c.id, c.name, c.email, c.phone, c.status, c.risk_segment,
      c.avg_transaction_amount, c.monthly_volume_limit,
      c.primary_city, c.primary_country, c.primary_lat, c.primary_lng, isoNow
    );
  }

  // 3. Seed Accounts
  const insertAccount = db.prepare(`
    INSERT INTO accounts (id, customer_id, account_number, account_type, balance, currency, status, last_active_at, is_dormant, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const accounts = [
    { id: 'ACC-2001', customer_id: 'CUST-1001', account_number: '4021-9921-1001-4412', account_type: 'CHECKING', balance: 4850.25, currency: 'USD', status: 'ACTIVE', last_active_at: new Date(Date.now() - 3600000).toISOString(), is_dormant: 0 },
    { id: 'ACC-2002', customer_id: 'CUST-1002', account_number: '4021-9921-1002-8874', account_type: 'CHECKING', balance: 28400.00, currency: 'USD', status: 'ACTIVE', last_active_at: new Date(Date.now() - 7200000).toISOString(), is_dormant: 0 },
    { id: 'ACC-2003', customer_id: 'CUST-1003', account_number: '4021-9921-1003-3390', account_type: 'CHECKING', balance: 64150.80, currency: 'USD', status: 'ACTIVE', last_active_at: new Date(Date.now() - 1800000).toISOString(), is_dormant: 0 },
    { id: 'ACC-2004', customer_id: 'CUST-1004', account_number: '4021-9921-1004-7123', account_type: 'SAVINGS', balance: 14200.00, currency: 'USD', status: 'ACTIVE', last_active_at: new Date(Date.now() - 42 * 86400000).toISOString(), is_dormant: 1 }, // 42 days dormant!
    { id: 'ACC-2005', customer_id: 'CUST-1005', account_number: '4021-9921-1005-5561', account_type: 'CHECKING', balance: 18900.50, currency: 'GBP', status: 'ACTIVE', last_active_at: new Date(Date.now() - 5400000).toISOString(), is_dormant: 0 },
    { id: 'ACC-2006', customer_id: 'CUST-1006', account_number: '4021-9921-1006-2209', account_type: 'CHECKING', balance: 1250.75, currency: 'USD', status: 'ACTIVE', last_active_at: new Date(Date.now() - 1200000).toISOString(), is_dormant: 0 }
  ];

  for (const a of accounts) {
    insertAccount.run(a.id, a.customer_id, a.account_number, a.account_type, a.balance, a.currency, a.status, a.last_active_at, a.is_dormant, isoNow);
  }

  // 4. Seed Baseline Transactions
  const insertTx = db.prepare(`
    INSERT INTO transactions (
      id, account_id, customer_id, amount, currency, merchant_name, merchant_category, channel,
      location_city, location_country, latitude, longitude, ip_address, device_id, device_os,
      is_trusted_device, risk_score, risk_level, status, triggered_rules_json, explainability_summary, timestamp, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const initialTx = [
    {
      id: 'TX-10001',
      account_id: 'ACC-2001',
      customer_id: 'CUST-1001',
      amount: 42.50,
      currency: 'USD',
      merchant_name: 'Whole Foods Market',
      merchant_category: 'GROCERY',
      channel: 'POS',
      location_city: 'New York',
      location_country: 'US',
      latitude: 40.7128,
      longitude: -74.0060,
      ip_address: '198.51.100.24',
      device_id: 'DEV-IPHONE-15-NYC',
      device_os: 'iOS 17.4',
      is_trusted_device: 1,
      risk_score: 5,
      risk_level: 'LOW',
      status: 'APPROVED',
      triggered_rules_json: '[]',
      explainability_summary: 'Normal routine transaction. Amount is consistent with customer baseline ($85.50 avg). Location matches registered home city.',
      timestamp: new Date(Date.now() - 3600000 * 4).toISOString()
    },
    {
      id: 'TX-10002',
      account_id: 'ACC-2002',
      customer_id: 'CUST-1002',
      amount: 680.00,
      currency: 'USD',
      merchant_name: 'Delta Air Lines',
      merchant_category: 'TRAVEL',
      channel: 'ONLINE',
      location_city: 'Chicago',
      location_country: 'US',
      latitude: 41.8781,
      longitude: -87.6298,
      ip_address: '198.51.100.88',
      device_id: 'DEV-MACBOOK-CHI',
      device_os: 'macOS 14.2',
      is_trusted_device: 1,
      risk_score: 12,
      risk_level: 'LOW',
      status: 'APPROVED',
      triggered_rules_json: '[]',
      explainability_summary: 'Authorized travel purchase within acceptable standard deviation of high-net-worth segment.',
      timestamp: new Date(Date.now() - 3600000 * 3).toISOString()
    },
    {
      id: 'TX-10003',
      account_id: 'ACC-2005',
      customer_id: 'CUST-1005',
      amount: 145.20,
      currency: 'GBP',
      merchant_name: 'Sainsburys Central',
      merchant_category: 'GROCERY',
      channel: 'POS',
      location_city: 'London',
      location_country: 'GB',
      latitude: 51.5074,
      longitude: -0.1278,
      ip_address: '82.165.197.1',
      device_id: 'DEV-PIXEL8-LDN',
      device_os: 'Android 14',
      is_trusted_device: 1,
      risk_score: 8,
      risk_level: 'LOW',
      status: 'APPROVED',
      triggered_rules_json: '[]',
      explainability_summary: 'Routine retail transaction in customer home city with registered trusted mobile device.',
      timestamp: new Date(Date.now() - 3600000 * 2).toISOString()
    },
    {
      id: 'TX-10004',
      account_id: 'ACC-2001',
      customer_id: 'CUST-1001',
      amount: 2450.00,
      currency: 'USD',
      merchant_name: 'CoinHaven Offshore Exchange',
      merchant_category: 'CRYPTO',
      channel: 'ONLINE',
      location_city: 'Lagos',
      location_country: 'NG',
      latitude: 6.5244,
      longitude: 3.3792,
      ip_address: '102.89.44.12',
      device_id: 'DEV-UNKNOWN-WIN10',
      device_os: 'Windows 10',
      is_trusted_device: 0,
      risk_score: 88,
      risk_level: 'HIGH',
      status: 'BLOCKED',
      triggered_rules_json: JSON.stringify([
        { ruleCode: 'AMOUNT_ANOMALY', ruleName: 'Unusual Amount Deviation', weight: 30, pointsAdded: 30, explanation: 'Amount $2,450.00 is 28.6x customer average ($85.50).' },
        { ruleCode: 'GEO_IMPOSSIBLE', ruleName: 'Impossible Travel / Teleportation', weight: 45, pointsAdded: 45, explanation: 'Transaction occurred in Lagos, Nigeria (8,510 km from previous NY transaction 2 hours ago). Implied speed: 4,255 km/h.' },
        { ruleCode: 'HIGH_RISK_CATEGORY', ruleName: 'High-Risk Merchant Category', weight: 25, pointsAdded: 25, explanation: 'Offshore cryptocurrency exchange flagged for capital flight risk.' },
        { ruleCode: 'DEVICE_MISMATCH', ruleName: 'Untrusted Device or Suspicious IP', weight: 20, pointsAdded: 20, explanation: 'Unrecognized Windows device with foreign ISP.' }
      ]),
      explainability_summary: 'CRITICAL FRAUD ALERT (Score 88/100): High-confidence account takeover detected. Amount ($2,450.00) is 28x historical average, originated from an unknown device in Lagos Nigeria 2 hours after a NY transaction (physical teleportation anomaly), targeting an offshore cryptocurrency platform. Automatically blocked to prevent financial loss.',
      timestamp: new Date(Date.now() - 3600000).toISOString()
    }
  ];

  for (const t of initialTx) {
    insertTx.run(
      t.id, t.account_id, t.customer_id, t.amount, t.currency, t.merchant_name, t.merchant_category, t.channel,
      t.location_city, t.location_country, t.latitude, t.longitude, t.ip_address, t.device_id, t.device_os,
      t.is_trusted_device, t.risk_score, t.risk_level, t.status, t.triggered_rules_json, t.explainability_summary,
      t.timestamp, isoNow
    );
  }

  // 5. Seed Investigation for the Blocked Transaction
  const insertInv = db.prepare(`
    INSERT INTO investigations (id, transaction_id, customer_id, status, priority, assigned_analyst, analyst_notes, resolution_reason, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertInv.run(
    'INV-8001',
    'TX-10004',
    'CUST-1001',
    'PENDING',
    'CRITICAL',
    'Unassigned',
    'Automated rule engine blocked transaction. Customer SMS verification dispatched.',
    '',
    new Date(Date.now() - 3600000).toISOString(),
    new Date(Date.now() - 3600000).toISOString()
  );

  // 6. Seed Audit Logs
  const insertAudit = db.prepare(`
    INSERT INTO audit_logs (id, transaction_id, investigation_id, actor, action, details, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertAudit.run(
    uuidv4(),
    'TX-10004',
    'INV-8001',
    'SYSTEM_RULE_ENGINE',
    'TRANSACTION_BLOCKED',
    'Transaction TX-10004 scored 88/100 (HIGH RISK). Triggered: AMOUNT_ANOMALY (+30), GEO_IMPOSSIBLE (+45), HIGH_RISK_CATEGORY (+25), DEVICE_MISMATCH (+20). Funds withheld automatically.',
    new Date(Date.now() - 3600000).toISOString()
  );

  insertAudit.run(
    uuidv4(),
    'TX-10004',
    'INV-8001',
    'SYSTEM_ALERT_DISPATCHER',
    'CUSTOMER_NOTIFIED',
    'Sent automated SMS security challenge to Alice Walker at +1 (555) 234-8901 regarding $2,450.00 attempt at CoinHaven Offshore.',
    new Date(Date.now() - 3590000).toISOString()
  );

  // 7. Seed Customer Notification
  const insertNotification = db.prepare(`
    INSERT INTO customer_notifications (id, customer_id, transaction_id, type, phone_or_email, message, status, sent_at, responded_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertNotification.run(
    'NOTIF-5001',
    'CUST-1001',
    'TX-10004',
    'SMS',
    '+1 (555) 234-8901',
    'SECURITY ALERT: FraudGuard blocked a charge of $2,450.00 at CoinHaven Offshore (Lagos, NG). Reply YES if this was you, or NO to permanently freeze your card.',
    'SENT',
    new Date(Date.now() - 3590000).toISOString(),
    null
  );
}
