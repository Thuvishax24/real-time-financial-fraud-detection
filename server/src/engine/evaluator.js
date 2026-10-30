import { db } from '../db/database.js';
import { v4 as uuidv4 } from 'uuid';
import {
  checkVelocitySpike,
  checkAmountAnomaly,
  checkGeoImpossible,
  checkHighRiskCategory,
  checkDormantBurst,
  checkOddHours,
  checkDeviceMismatch,
  checkCardTesting
} from './rules.js';
import { generateExplainabilityReport } from './explainability.js';

export function evaluateTransaction(txInput) {
  const txId = txInput.id || `TX-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`;
  const timestamp = txInput.timestamp || new Date().toISOString();

  // 1. Fetch customer and account details
  let customer = null;
  let account = null;

  if (txInput.account_id) {
    account = db.prepare('SELECT * FROM accounts WHERE id = ?').get(txInput.account_id);
    if (account) {
      customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(account.customer_id);
    }
  } else if (txInput.customer_id) {
    customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(txInput.customer_id);
    if (customer) {
      account = db.prepare('SELECT * FROM accounts WHERE customer_id = ? LIMIT 1').get(customer.id);
    }
  }

  // Fallbacks if not found
  if (!customer) {
    customer = {
      id: txInput.customer_id || 'CUST-GUEST',
      name: txInput.customer_name || 'Anonymous User',
      email: 'user@example.com',
      phone: '+1 (555) 000-0000',
      status: 'ACTIVE',
      avg_transaction_amount: 100.0,
      primary_city: txInput.location_city || 'New York',
      primary_country: txInput.location_country || 'US',
      primary_lat: txInput.latitude || 40.7128,
      primary_lng: txInput.longitude || -74.0060
    };
  }

  if (!account) {
    account = {
      id: txInput.account_id || 'ACC-DEFAULT',
      customer_id: customer.id,
      balance: 10000.0,
      currency: txInput.currency || 'USD',
      status: 'ACTIVE',
      is_dormant: 0,
      last_active_at: new Date(Date.now() - 3600000).toISOString()
    };
  }

  // Formatted tx object for rules
  const normalizedTx = {
    id: txId,
    account_id: account.id,
    customer_id: customer.id,
    amount: parseFloat(txInput.amount) || 0,
    currency: txInput.currency || account.currency || 'USD',
    merchant_name: txInput.merchant_name || 'Unknown Merchant',
    merchant_category: (txInput.merchant_category || 'RETAIL').toUpperCase(),
    channel: (txInput.channel || 'ONLINE').toUpperCase(),
    location_city: txInput.location_city || 'New York',
    location_country: txInput.location_country || 'US',
    latitude: txInput.latitude !== undefined ? parseFloat(txInput.latitude) : customer.primary_lat,
    longitude: txInput.longitude !== undefined ? parseFloat(txInput.longitude) : customer.primary_lng,
    ip_address: txInput.ip_address || '192.168.1.1',
    device_id: txInput.device_id || 'DEV-STANDARD',
    device_os: txInput.device_os || 'iOS 17',
    is_trusted_device: txInput.is_trusted_device === 0 || txInput.is_trusted_device === false ? 0 : 1,
    timestamp
  };

  // Check if account is frozen
  if (account.status === 'FROZEN' || customer.status === 'FROZEN') {
    const report = {
      score: 100,
      riskLevel: 'HIGH',
      status: 'BLOCKED',
      actionTitle: 'Blocked - Account Frozen',
      summary: `Transaction strictly rejected: Account ${account.id} or Customer ${customer.name} is currently FROZEN due to prior security action.`,
      recommendation: 'Account must be unfrozen by an authorized senior analyst before any activity can be processed.',
      factorBreakdown: [{
        code: 'ACCOUNT_FROZEN',
        name: 'Account / Customer Frozen',
        points: 100,
        percentageOfTotal: 100,
        explanation: 'Account has been frozen by security operations.'
      }],
      ruleCount: 1,
      evaluatedAt: new Date().toISOString()
    };

    return persistAndRecord(normalizedTx, customer, account, report, []);
  }

  // 2. Evaluate all 8 Fraud Rules
  const triggeredRules = [];

  const rVelocity = checkVelocitySpike(normalizedTx, account.id);
  if (rVelocity) triggeredRules.push(rVelocity);

  const rAmount = checkAmountAnomaly(normalizedTx, customer);
  if (rAmount) triggeredRules.push(rAmount);

  const rGeo = checkGeoImpossible(normalizedTx, account.id, customer);
  if (rGeo) triggeredRules.push(rGeo);

  const rCat = checkHighRiskCategory(normalizedTx);
  if (rCat) triggeredRules.push(rCat);

  const rDormant = checkDormantBurst(normalizedTx, account);
  if (rDormant) triggeredRules.push(rDormant);

  const rHours = checkOddHours(normalizedTx);
  if (rHours) triggeredRules.push(rHours);

  const rDevice = checkDeviceMismatch(normalizedTx);
  if (rDevice) triggeredRules.push(rDevice);

  const rCardTesting = checkCardTesting(normalizedTx, account.id);
  if (rCardTesting) triggeredRules.push(rCardTesting);

  // 3. Generate Explainability Report & Risk Score
  const report = generateExplainabilityReport(triggeredRules, normalizedTx, customer, account);

  // 4. Persist to DB and create investigations / notifications if needed
  return persistAndRecord(normalizedTx, customer, account, report, triggeredRules);
}

function persistAndRecord(tx, customer, account, report, triggeredRules) {
  const isoNow = new Date().toISOString();

  // Save Transaction
  const insertTx = db.prepare(`
    INSERT INTO transactions (
      id, account_id, customer_id, amount, currency, merchant_name, merchant_category, channel,
      location_city, location_country, latitude, longitude, ip_address, device_id, device_os,
      is_trusted_device, risk_score, risk_level, status, triggered_rules_json, explainability_summary, timestamp, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertTx.run(
    tx.id, tx.account_id, tx.customer_id, tx.amount, tx.currency, tx.merchant_name, tx.merchant_category, tx.channel,
    tx.location_city, tx.location_country, tx.latitude, tx.longitude, tx.ip_address, tx.device_id, tx.device_os,
    tx.is_trusted_device, report.score, report.riskLevel, report.status,
    JSON.stringify(triggeredRules), report.summary, tx.timestamp, isoNow
  );

  // Update Account activity / balance
  if (report.status === 'APPROVED') {
    db.prepare(`
      UPDATE accounts
      SET balance = balance - ?, last_active_at = ?, is_dormant = 0
      WHERE id = ?
    `).run(tx.amount, tx.timestamp, account.id);
  } else {
    db.prepare(`
      UPDATE accounts
      SET last_active_at = ?
      WHERE id = ?
    `).run(tx.timestamp, account.id);
  }

  let investigation = null;
  let customerNotification = null;

  // 5. If FLAGGED or BLOCKED, auto-generate investigation case
  if (report.status === 'FLAGGED' || report.status === 'BLOCKED') {
    const invId = `INV-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`;
    const priority = report.status === 'BLOCKED' ? 'CRITICAL' : 'HIGH';

    db.prepare(`
      INSERT INTO investigations (id, transaction_id, customer_id, status, priority, assigned_analyst, analyst_notes, resolution_reason, created_at, updated_at)
      VALUES (?, ?, ?, 'PENDING', ?, 'Unassigned', ?, '', ?, ?)
    `).run(
      invId, tx.id, customer.id, priority,
      `System auto-generated investigation. Risk Score: ${report.score}/100. Factors: ${triggeredRules.map(r => r.ruleName).join(', ')}`,
      isoNow, isoNow
    );

    investigation = {
      id: invId,
      transaction_id: tx.id,
      customer_id: customer.id,
      status: 'PENDING',
      priority,
      assigned_analyst: 'Unassigned',
      created_at: isoNow
    };

    // Auto-generate Customer Notification
    const notifId = `NOTIF-${Date.now().toString().slice(-6)}`;
    const notifMessage = report.status === 'BLOCKED'
      ? `SECURITY ALERT: FraudGuard has TEMPORARILY BLOCKED a transaction of $${tx.amount.toFixed(2)} at ${tx.merchant_name} (${tx.location_city}, ${tx.location_country}). Did you make this transaction?`
      : `SECURITY NOTICE: A transaction of $${tx.amount.toFixed(2)} at ${tx.merchant_name} has been flagged for routine verification. Was this authorized by you?`;

    db.prepare(`
      INSERT INTO customer_notifications (id, customer_id, transaction_id, type, phone_or_email, message, status, sent_at)
      VALUES (?, ?, ?, 'SMS', ?, ?, 'SENT', ?)
    `).run(notifId, customer.id, tx.id, customer.phone, notifMessage, isoNow);

    customerNotification = {
      id: notifId,
      customer_id: customer.id,
      customer_name: customer.name,
      transaction_id: tx.id,
      phone: customer.phone,
      message: notifMessage,
      status: 'SENT',
      sent_at: isoNow
    };

    // Log in Audit Trail
    db.prepare(`
      INSERT INTO audit_logs (id, transaction_id, investigation_id, actor, action, details, timestamp)
      VALUES (?, ?, ?, 'SYSTEM_RULE_ENGINE', ?, ?, ?)
    `).run(
      uuidv4(), tx.id, invId,
      report.status === 'BLOCKED' ? 'AUTO_BLOCKED_HIGH_RISK' : 'AUTO_FLAGGED_MEDIUM_RISK',
      `Transaction ${tx.id} evaluated. Score: ${report.score}/100 (${report.riskLevel}). Triggered rules: [${triggeredRules.map(r => r.ruleCode).join(', ')}]. ${report.summary}`,
      isoNow
    );
  } else {
    // Normal approved audit log
    db.prepare(`
      INSERT INTO audit_logs (id, transaction_id, investigation_id, actor, action, details, timestamp)
      VALUES (?, ?, NULL, 'SYSTEM_RULE_ENGINE', 'TRANSACTION_APPROVED', ?, ?)
    `).run(
      uuidv4(), tx.id,
      `Transaction ${tx.id} evaluated. Score: ${report.score}/100 (APPROVED). Customer: ${customer.name}, Amount: $${tx.amount.toFixed(2)} at ${tx.merchant_name}`,
      isoNow
    );
  }

  return {
    transaction: {
      ...tx,
      risk_score: report.score,
      risk_level: report.riskLevel,
      status: report.status,
      triggered_rules_json: JSON.stringify(triggeredRules),
      explainability_summary: report.summary,
      customer_name: customer.name,
      customer_email: customer.email,
      account_number: account.account_number
    },
    explainability: report,
    investigation,
    customerNotification
  };
}
