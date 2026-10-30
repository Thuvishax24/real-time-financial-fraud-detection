import { Router } from 'express';
import { db } from '../db/database.js';
import { v4 as uuidv4 } from 'uuid';
import { socketManager } from '../ws/socketManager.js';

const router = Router();

// GET /api/customer-alerts
router.get('/', (req, res) => {
  try {
    const { status, limit = 20 } = req.query;
    let query = `
      SELECT n.*, c.name as customer_name, c.email as customer_email,
             t.amount, t.merchant_name, t.risk_score, t.status as tx_status
      FROM customer_notifications n
      JOIN customers c ON n.customer_id = c.id
      JOIN transactions t ON n.transaction_id = t.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ` AND n.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY n.sent_at DESC LIMIT ?`;
    params.push(Number(limit));

    const alerts = db.prepare(query).all(...params);
    res.json({ success: true, count: alerts.length, data: alerts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/customer-alerts/:id/respond
router.post('/:id/respond', (req, res) => {
  try {
    const notifId = req.params.id;
    const { response } = req.body; // 'CONFIRM_LEGITIMATE' or 'REPORT_FRAUD'

    const notif = db.prepare('SELECT * FROM customer_notifications WHERE id = ?').get(notifId);
    if (!notif) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }

    const isoNow = new Date().toISOString();

    if (response === 'REPORT_FRAUD') {
      // Customer replied "NO - Block My Card!"
      db.prepare(`
        UPDATE customer_notifications
        SET status = 'REPORTED_FRAUD', responded_at = ?
        WHERE id = ?
      `).run(isoNow, notifId);

      // Freeze customer & account
      db.prepare(`UPDATE customers SET status = 'FROZEN' WHERE id = ?`).run(notif.customer_id);
      const tx = db.prepare('SELECT account_id FROM transactions WHERE id = ?').get(notif.transaction_id);
      if (tx && tx.account_id) {
        db.prepare(`UPDATE accounts SET status = 'FROZEN' WHERE id = ?`).run(tx.account_id);
      }

      // Mark transaction and investigation
      db.prepare(`UPDATE transactions SET status = 'CONFIRMED_FRAUD' WHERE id = ?`).run(notif.transaction_id);
      db.prepare(`
        UPDATE investigations
        SET status = 'CONFIRMED_FRAUD', resolution_reason = 'Customer responded NO to SMS security challenge. Stolen credentials confirmed.', resolved_at = ?, updated_at = ?
        WHERE transaction_id = ?
      `).run(isoNow, isoNow, notif.transaction_id);

      // Audit Log
      db.prepare(`
        INSERT INTO audit_logs (id, transaction_id, investigation_id, actor, action, details, timestamp)
        VALUES (?, ?, NULL, 'CUSTOMER_MOBILE_RESPONSE', 'FRAUD_REPORTED_CARD_FROZEN', ?, ?)
      `).run(
        uuidv4(), notif.transaction_id,
        `Customer replied NO to security SMS. Customer account immediately FROZEN to block further unauthorized charges.`,
        isoNow
      );
    } else if (response === 'CONFIRM_LEGITIMATE') {
      // Customer replied "YES - It was me"
      db.prepare(`
        UPDATE customer_notifications
        SET status = 'VERIFIED_LEGITIMATE', responded_at = ?
        WHERE id = ?
      `).run(isoNow, notifId);

      db.prepare(`
        UPDATE investigations
        SET analyst_notes = analyst_notes || '\n[CUSTOMER SMS ' || ? || ']: Customer replied YES confirming transaction authorization.', updated_at = ?
        WHERE transaction_id = ?
      `).run(isoNow.slice(11, 16), isoNow, notif.transaction_id);

      // Audit Log
      db.prepare(`
        INSERT INTO audit_logs (id, transaction_id, investigation_id, actor, action, details, timestamp)
        VALUES (?, ?, NULL, 'CUSTOMER_MOBILE_RESPONSE', 'CUSTOMER_VERIFIED_AUTHORIZED', ?, ?)
      `).run(
        uuidv4(), notif.transaction_id,
        `Customer replied YES to security challenge confirming they authorized this transaction. Analyst can proceed to release funds.`,
        isoNow
      );
    } else {
      return res.status(400).json({ success: false, error: 'Invalid response type. Use CONFIRM_LEGITIMATE or REPORT_FRAUD' });
    }

    const updated = db.prepare('SELECT * FROM customer_notifications WHERE id = ?').get(notifId);

    socketManager.broadcast('CUSTOMER_ALERT_UPDATED', {
      notificationId: notifId,
      response,
      transactionId: notif.transaction_id,
      customerId: notif.customer_id
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
