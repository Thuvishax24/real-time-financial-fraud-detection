import { Router } from 'express';
import { db } from '../db/database.js';

const router = Router();

// GET /api/stats
router.get('/', (req, res) => {
  try {
    const totalRow = db.prepare('SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total_volume FROM transactions').get();
    const approvedRow = db.prepare("SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total_volume FROM transactions WHERE status = 'APPROVED' OR status = 'CLEARED'").get();
    const flaggedRow = db.prepare("SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total_volume FROM transactions WHERE status = 'FLAGGED'").get();
    const blockedRow = db.prepare("SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total_volume FROM transactions WHERE status = 'BLOCKED' OR status = 'CONFIRMED_FRAUD'").get();

    const pendingInvRow = db.prepare("SELECT COUNT(*) as count FROM investigations WHERE status = 'PENDING' OR status = 'UNDER_REVIEW'").get();
    const frozenAccRow = db.prepare("SELECT COUNT(*) as count FROM accounts WHERE status = 'FROZEN'").get();
    const avgScoreRow = db.prepare('SELECT COALESCE(AVG(risk_score), 0) as avg_score FROM transactions').get();

    const totalTx = totalRow ? totalRow.count : 0;
    const blockedCount = blockedRow ? blockedRow.count : 0;
    const flaggedCount = flaggedRow ? flaggedRow.count : 0;
    const fraudRate = totalTx > 0 ? (((blockedCount + flaggedCount) / totalTx) * 100).toFixed(1) : 0;
    const preventedLoss = blockedRow ? blockedRow.total_volume : 0;

    // Rule trigger frequency breakdown
    const allTxWithRules = db.prepare("SELECT triggered_rules_json FROM transactions WHERE triggered_rules_json IS NOT NULL AND triggered_rules_json != '[]'").all();
    const ruleCounts = {};
    for (const row of allTxWithRules) {
      try {
        const rules = JSON.parse(row.triggered_rules_json);
        for (const r of rules) {
          ruleCounts[r.ruleCode] = (ruleCounts[r.ruleCode] || 0) + 1;
        }
      } catch (e) {}
    }

    const ruleFrequency = Object.entries(ruleCounts).map(([code, count]) => ({
      code,
      count
    })).sort((a, b) => b.count - a.count);

    // Risk Tier Distribution
    const lowRiskCount = db.prepare('SELECT COUNT(*) as count FROM transactions WHERE risk_score < 40').get().count;
    const medRiskCount = db.prepare('SELECT COUNT(*) as count FROM transactions WHERE risk_score >= 40 AND risk_score < 70').get().count;
    const highRiskCount = db.prepare('SELECT COUNT(*) as count FROM transactions WHERE risk_score >= 70').get().count;

    res.json({
      success: true,
      data: {
        totalTransactions: totalTx,
        totalVolume: totalRow ? totalRow.total_volume : 0,
        approvedCount: approvedRow ? approvedRow.count : 0,
        flaggedCount,
        blockedCount,
        fraudRate: parseFloat(fraudRate),
        preventedLoss: Math.round(preventedLoss * 100) / 100,
        pendingInvestigations: pendingInvRow ? pendingInvRow.count : 0,
        frozenAccounts: frozenAccRow ? frozenAccRow.count : 0,
        averageRiskScore: Math.round(avgScoreRow.avg_score),
        riskDistribution: {
          low: lowRiskCount,
          medium: medRiskCount,
          high: highRiskCount
        },
        ruleFrequency
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
