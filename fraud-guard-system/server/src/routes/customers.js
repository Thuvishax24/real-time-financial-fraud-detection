import { Router } from 'express';
import { db } from '../db/database.js';

const router = Router();

// GET /api/customers
router.get('/', (req, res) => {
  try {
    const customers = db.prepare(`
      SELECT c.*,
             a.id as account_id, a.account_number, a.balance, a.status as account_status, a.is_dormant
      FROM customers c
      LEFT JOIN accounts a ON c.id = a.customer_id
      ORDER BY c.name ASC
    `).all();

    res.json({ success: true, count: customers.length, data: customers });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/customers/:id/unfreeze (Analyst can restore frozen customer account)
router.post('/:id/unfreeze', (req, res) => {
  try {
    const customerId = req.params.id;
    const { analystName = 'Senior Security Analyst' } = req.body;

    db.prepare(`UPDATE customers SET status = 'ACTIVE' WHERE id = ?`).run(customerId);
    db.prepare(`UPDATE accounts SET status = 'ACTIVE' WHERE customer_id = ?`).run(customerId);

    db.prepare(`
      INSERT INTO audit_logs (id, transaction_id, investigation_id, actor, action, details, timestamp)
      VALUES (hex(randomblob(16)), NULL, NULL, ?, 'ACCOUNT_UNFROZEN', ?, ?)
    `).run(
      analystName,
      `Customer ${customerId} and associated accounts have been restored to ACTIVE status by ${analystName} after security verification.`,
      new Date().toISOString()
    );

    res.json({ success: true, message: `Customer ${customerId} successfully unfrozen.` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
