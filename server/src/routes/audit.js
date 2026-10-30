import { Router } from 'express';
import { db } from '../db/database.js';

const router = Router();

// GET /api/audit-logs
router.get('/', (req, res) => {
  try {
    const { action, actor, transaction_id, limit = 100, offset = 0 } = req.query;

    let query = `SELECT * FROM audit_logs WHERE 1=1`;
    const params = [];

    if (action) {
      query += ` AND action LIKE ?`;
      params.push(`%${action}%`);
    }
    if (actor) {
      query += ` AND actor = ?`;
      params.push(actor);
    }
    if (transaction_id) {
      query += ` AND transaction_id = ?`;
      params.push(transaction_id);
    }

    query += ` ORDER BY timestamp DESC LIMIT ? OFFSET ?`;
    params.push(Number(limit), Number(offset));

    const logs = db.prepare(query).all(...params);
    res.json({ success: true, count: logs.length, data: logs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
