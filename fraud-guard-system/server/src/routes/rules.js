import { Router } from 'express';
import { db } from '../db/database.js';
import { v4 as uuidv4 } from 'uuid';
import { socketManager } from '../ws/socketManager.js';

const router = Router();

// GET /api/rules
router.get('/', (req, res) => {
  try {
    const rules = db.prepare('SELECT * FROM rules ORDER BY category, weight DESC').all();
    res.json({ success: true, count: rules.length, data: rules });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/rules/:code
router.put('/:code', (req, res) => {
  try {
    const { code } = req.params;
    const { weight, threshold, enabled, time_window_seconds } = req.body;

    const rule = db.prepare('SELECT * FROM rules WHERE code = ?').get(code);
    if (!rule) {
      return res.status(404).json({ success: false, error: 'Rule not found' });
    }

    const updatedWeight = weight !== undefined ? Number(weight) : rule.weight;
    const updatedThreshold = threshold !== undefined ? Number(threshold) : rule.threshold;
    const updatedEnabled = enabled !== undefined ? (enabled ? 1 : 0) : rule.enabled;
    const updatedWindow = time_window_seconds !== undefined ? Number(time_window_seconds) : rule.time_window_seconds;

    db.prepare(`
      UPDATE rules
      SET weight = ?, threshold = ?, enabled = ?, time_window_seconds = ?
      WHERE code = ?
    `).run(updatedWeight, updatedThreshold, updatedEnabled, updatedWindow, code);

    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (id, transaction_id, investigation_id, actor, action, details, timestamp)
      VALUES (?, NULL, NULL, 'SYSTEM_ADMIN', 'RULE_CONFIG_UPDATED', ?, ?)
    `).run(
      uuidv4(),
      `Rule ${code} updated. Weight: ${updatedWeight}, Threshold: ${updatedThreshold}, Enabled: ${updatedEnabled}, Window: ${updatedWindow}s`,
      new Date().toISOString()
    );

    const updated = db.prepare('SELECT * FROM rules WHERE code = ?').get(code);

    socketManager.broadcast('RULE_UPDATED', updated);

    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
