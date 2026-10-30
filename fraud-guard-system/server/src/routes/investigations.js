import { Router } from 'express';
import { db } from '../db/database.js';
import { v4 as uuidv4 } from 'uuid';
import { socketManager } from '../ws/socketManager.js';

const router = Router();

// GET /api/investigations
router.get('/', (req, res) => {
  try {
    const { status, priority, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT inv.*,
             t.amount, t.currency, t.merchant_name, t.merchant_category, t.location_city, t.location_country,
             t.risk_score, t.risk_level, t.status as tx_status, t.timestamp as tx_timestamp,
             t.triggered_rules_json, t.explainability_summary,
             c.name as customer_name, c.email as customer_email, c.phone as customer_phone, c.status as customer_status
      FROM investigations inv
      JOIN transactions t ON inv.transaction_id = t.id
      JOIN customers c ON inv.customer_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ` AND inv.status = ?`;
      params.push(status);
    }
    if (priority) {
      query += ` AND inv.priority = ?`;
      params.push(priority);
    }

    query += ` ORDER BY inv.created_at DESC LIMIT ? OFFSET ?`;
    params.push(Number(limit), Number(offset));

    const rows = db.prepare(query).all(...params);

    const parsed = rows.map(r => ({
      ...r,
      triggered_rules: r.triggered_rules_json ? JSON.parse(r.triggered_rules_json) : []
    }));

    res.json({ success: true, count: parsed.length, data: parsed });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/investigations/:id
router.get('/:id', (req, res) => {
  try {
    const inv = db.prepare(`
      SELECT inv.*,
             t.amount, t.currency, t.merchant_name, t.merchant_category, t.channel,
             t.location_city, t.location_country, t.latitude, t.longitude,
             t.device_id, t.device_os, t.ip_address, t.is_trusted_device,
             t.risk_score, t.risk_level, t.status as tx_status, t.timestamp as tx_timestamp,
             t.triggered_rules_json, t.explainability_summary,
             c.name as customer_name, c.email as customer_email, c.phone as customer_phone,
             c.avg_transaction_amount, c.primary_city, c.status as customer_status,
             a.id as account_id, a.account_number, a.balance as account_balance, a.status as account_status
      FROM investigations inv
      JOIN transactions t ON inv.transaction_id = t.id
      JOIN customers c ON inv.customer_id = c.id
      LEFT JOIN accounts a ON t.account_id = a.id
      WHERE inv.id = ?
    `).get(req.params.id);

    if (!inv) {
      return res.status(404).json({ success: false, error: 'Investigation not found' });
    }

    const auditLogs = db.prepare(`
      SELECT * FROM audit_logs WHERE investigation_id = ? OR transaction_id = ?
      ORDER BY timestamp DESC
    `).all(inv.id, inv.transaction_id);

    const notification = db.prepare(`
      SELECT * FROM customer_notifications WHERE transaction_id = ?
    `).get(inv.transaction_id);

    res.json({
      success: true,
      data: {
        ...inv,
        triggered_rules: inv.triggered_rules_json ? JSON.parse(inv.triggered_rules_json) : [],
        audit_logs: auditLogs,
        customer_notification: notification || null
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/investigations/:id/action
router.post('/:id/action', (req, res) => {
  try {
    const { action, analystName = 'Senior Analyst', notes = '', reason = '' } = req.body;
    const invId = req.params.id;

    const inv = db.prepare('SELECT * FROM investigations WHERE id = ?').get(invId);
    if (!inv) {
      return res.status(404).json({ success: false, error: 'Investigation not found' });
    }

    const isoNow = new Date().toISOString();

    if (action === 'RELEASE_AND_APPROVE') {
      // 1. Unblock transaction
      db.prepare(`
        UPDATE transactions
        SET status = 'CLEARED', explainability_summary = explainability_summary || ' [OVERRIDDEN: Cleared by fraud analyst ' || ? || ']'
        WHERE id = ?
      `).run(analystName, inv.transaction_id);

      // 2. Resolve investigation
      db.prepare(`
        UPDATE investigations
        SET status = 'FALSE_POSITIVE_CLEARED', assigned_analyst = ?, analyst_notes = ?, resolution_reason = ?, resolved_at = ?, updated_at = ?
        WHERE id = ?
      `).run(analystName, notes, reason || 'Customer confirmed transaction / false positive', isoNow, isoNow, invId);

      // 3. Deduct transaction amount from account now that it is cleared
      const tx = db.prepare('SELECT * FROM transactions WHERE id = ?').get(inv.transaction_id);
      if (tx && tx.account_id) {
        db.prepare(`
          UPDATE accounts
          SET balance = balance - ?
          WHERE id = ?
        `).run(tx.amount, tx.account_id);
      }

      // 4. Audit Log
      db.prepare(`
        INSERT INTO audit_logs (id, transaction_id, investigation_id, actor, action, details, timestamp)
        VALUES (?, ?, ?, ?, 'RELEASED_AND_CLEARED', ?, ?)
      `).run(
        uuidv4(), inv.transaction_id, invId, analystName,
        `Analyst ${analystName} cleared transaction. Reason: ${reason || 'False positive'}. Notes: ${notes}`,
        isoNow
      );
    } else if (action === 'CONFIRM_FRAUD_AND_FREEZE') {
      // 1. Mark transaction as CONFIRMED_FRAUD
      db.prepare(`
        UPDATE transactions
        SET status = 'CONFIRMED_FRAUD', explainability_summary = explainability_summary || ' [CONFIRMED FRAUD: Account frozen by ' || ? || ']'
        WHERE id = ?
      `).run(analystName, inv.transaction_id);

      // 2. Resolve investigation
      db.prepare(`
        UPDATE investigations
        SET status = 'CONFIRMED_FRAUD', assigned_analyst = ?, analyst_notes = ?, resolution_reason = ?, resolved_at = ?, updated_at = ?
        WHERE id = ?
      `).run(analystName, notes, reason || 'Unauthorized activity confirmed. Account frozen.', isoNow, isoNow, invId);

      // 3. FREEZE customer and account to protect customer funds!
      db.prepare(`UPDATE customers SET status = 'FROZEN' WHERE id = ?`).run(inv.customer_id);
      const tx = db.prepare('SELECT account_id FROM transactions WHERE id = ?').get(inv.transaction_id);
      if (tx && tx.account_id) {
        db.prepare(`UPDATE accounts SET status = 'FROZEN' WHERE id = ?`).run(tx.account_id);
      }

      // 4. Audit Log
      db.prepare(`
        INSERT INTO audit_logs (id, transaction_id, investigation_id, actor, action, details, timestamp)
        VALUES (?, ?, ?, ?, 'FRAUD_CONFIRMED_ACCOUNT_FROZEN', ?, ?)
      `).run(
        uuidv4(), inv.transaction_id, invId, analystName,
        `Analyst ${analystName} confirmed fraud! Freezing customer ${inv.customer_id} and account. Reason: ${reason || 'Stolen credentials / unauthorized attack'}. Notes: ${notes}`,
        isoNow
      );
    } else if (action === 'ASSIGN_ANALYST') {
      db.prepare(`
        UPDATE investigations
        SET assigned_analyst = ?, status = 'UNDER_REVIEW', updated_at = ?
        WHERE id = ?
      `).run(analystName, isoNow, invId);

      db.prepare(`
        INSERT INTO audit_logs (id, transaction_id, investigation_id, actor, action, details, timestamp)
        VALUES (?, ?, ?, ?, 'CASE_ASSIGNED', ?, ?)
      `).run(
        uuidv4(), inv.transaction_id, invId, analystName,
        `Investigation assigned to analyst ${analystName}. Case moved to UNDER_REVIEW.`,
        isoNow
      );
    } else if (action === 'ADD_NOTE') {
      db.prepare(`
        UPDATE investigations
        SET analyst_notes = CASE WHEN analyst_notes = '' THEN ? ELSE analyst_notes || '\n[' || ? || ' ' || ? || ']: ' || ? END, updated_at = ?
        WHERE id = ?
      `).run(notes, analystName, isoNow.slice(11, 16), notes, isoNow, invId);

      db.prepare(`
        INSERT INTO audit_logs (id, transaction_id, investigation_id, actor, action, details, timestamp)
        VALUES (?, ?, ?, ?, 'NOTE_ADDED', ?, ?)
      `).run(
        uuidv4(), inv.transaction_id, invId, analystName,
        `Note added by ${analystName}: "${notes}"`,
        isoNow
      );
    } else {
      return res.status(400).json({ success: false, error: `Invalid action: ${action}` });
    }

    const updated = db.prepare('SELECT * FROM investigations WHERE id = ?').get(invId);

    // Broadcast investigation update
    socketManager.broadcast('INVESTIGATION_UPDATED', {
      investigationId: invId,
      action,
      analystName,
      status: updated.status,
      transactionId: inv.transaction_id
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
