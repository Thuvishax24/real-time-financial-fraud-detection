import { Router } from 'express';
import { db } from '../db/database.js';
import { evaluateTransaction } from '../engine/evaluator.js';
import { socketManager } from '../ws/socketManager.js';

const router = Router();

// GET /api/transactions
router.get('/', (req, res) => {
  try {
    const { status, risk_level, customer_id, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT t.*, c.name as customer_name, c.email as customer_email, a.account_number
      FROM transactions t
      LEFT JOIN customers c ON t.customer_id = c.id
      LEFT JOIN accounts a ON t.account_id = a.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ` AND t.status = ?`;
      params.push(status);
    }
    if (risk_level) {
      query += ` AND t.risk_level = ?`;
      params.push(risk_level);
    }
    if (customer_id) {
      query += ` AND t.customer_id = ?`;
      params.push(customer_id);
    }

    query += ` ORDER BY t.timestamp DESC LIMIT ? OFFSET ?`;
    params.push(Number(limit), Number(offset));

    const transactions = db.prepare(query).all(...params);

    const parsed = transactions.map(t => ({
      ...t,
      triggered_rules: t.triggered_rules_json ? JSON.parse(t.triggered_rules_json) : []
    }));

    res.json({ success: true, count: parsed.length, data: parsed });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/transactions/:id
router.get('/:id', (req, res) => {
  try {
    const tx = db.prepare(`
      SELECT t.*, c.name as customer_name, c.email as customer_email, c.phone as customer_phone,
             c.avg_transaction_amount as customer_avg_amount, c.primary_city as customer_city,
             c.status as customer_status, a.account_number, a.balance as account_balance, a.status as account_status
      FROM transactions t
      LEFT JOIN customers c ON t.customer_id = c.id
      LEFT JOIN accounts a ON t.account_id = a.id
      WHERE t.id = ?
    `).get(req.params.id);

    if (!tx) {
      return res.status(404).json({ success: false, error: 'Transaction not found' });
    }

    const triggeredRules = tx.triggered_rules_json ? JSON.parse(tx.triggered_rules_json) : [];
    const investigation = db.prepare('SELECT * FROM investigations WHERE transaction_id = ?').get(tx.id);
    const auditLogs = db.prepare('SELECT * FROM audit_logs WHERE transaction_id = ? ORDER BY timestamp DESC').all(tx.id);
    const notification = db.prepare('SELECT * FROM customer_notifications WHERE transaction_id = ?').get(tx.id);

    res.json({
      success: true,
      data: {
        ...tx,
        triggered_rules: triggeredRules,
        investigation: investigation || null,
        audit_logs: auditLogs || [],
        customer_notification: notification || null
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/transactions/evaluate (Manual or external transaction submission)
router.post('/evaluate', (req, res) => {
  try {
    const txInput = req.body;
    if (!txInput.amount || !txInput.customer_id) {
      return res.status(400).json({ success: false, error: 'customer_id and amount are required' });
    }

    const result = evaluateTransaction(txInput);

    // Broadcast in real-time
    socketManager.broadcast('NEW_TRANSACTION', result);
    if (result.transaction.status === 'BLOCKED' || result.transaction.status === 'FLAGGED') {
      socketManager.broadcast('HIGH_RISK_ALERT', result);
    }

    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
