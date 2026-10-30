/**
 * Explainability Generator for FraudGuard AI
 * Converts numerical weights and triggered rule signals into an audit-ready,
 * fully transparent narrative and breakdown for analysts and compliance teams.
 */

export function generateExplainabilityReport(triggeredRules, tx, customer, account) {
  const totalScore = Math.min(
    100,
    triggeredRules.reduce((acc, rule) => acc + (rule.pointsAdded || rule.weight || 0), 0)
  );

  let riskLevel = 'LOW';
  let status = 'APPROVED';
  let actionTitle = 'Approved by FraudGuard';

  if (totalScore >= 70) {
    riskLevel = 'HIGH';
    status = 'BLOCKED';
    actionTitle = 'Temporarily Blocked (High Risk Threat)';
  } else if (totalScore >= 40) {
    riskLevel = 'MEDIUM';
    status = 'FLAGGED';
    actionTitle = 'Flagged for Analyst Review (Medium Risk)';
  }

  // Generate plain-English summary narrative
  let summary = '';
  if (totalScore === 0) {
    summary = `Transaction of $${tx.amount.toFixed(2)} at ${tx.merchant_name} evaluated as standard genuine activity. No anomaly signals triggered. Device, location, and velocity conform to customer profile.`;
  } else if (riskLevel === 'LOW') {
    summary = `Transaction scored ${totalScore}/100 (Low Risk). Minor signal detected (${triggeredRules.map(r => r.ruleName).join(', ')}), but overall risk remains within acceptable baseline. Transaction processed normally.`;
  } else if (riskLevel === 'MEDIUM') {
    summary = `WARNING: Transaction of $${tx.amount.toFixed(2)} scored ${totalScore}/100 (Medium Risk) and was flagged for analyst investigation. Triggered ${triggeredRules.length} risk factor(s): ${triggeredRules.map(r => r.ruleName).join(', ')}. Action required to verify legitimacy.`;
  } else {
    // High Risk
    summary = `CRITICAL FRAUD ALERT: Transaction of $${tx.amount.toFixed(2)} scored ${totalScore}/100 (High Risk) and was TEMPORARILY BLOCKED. Immediate financial protection invoked due to severe anomalies: ${triggeredRules.map(r => `${r.ruleName} (+${r.pointsAdded} pts)`).join(', ')}.`;
  }

  // Recommendations for the analyst
  let recommendation = '';
  if (status === 'BLOCKED') {
    recommendation = 'Funds temporarily held. Maintain block until customer completes multi-factor out-of-band verification. If unauthorized, freeze account and issue new card credentials.';
  } else if (status === 'FLAGGED') {
    recommendation = 'Monitor account for velocity spikes. Review customer historical spend pattern and confirm geolocation veracity.';
  } else {
    recommendation = 'No analyst intervention required. Standard automated settlement.';
  }

  // Factor breakdown for UI bar charts
  const factorBreakdown = triggeredRules.map(r => ({
    code: r.ruleCode,
    name: r.ruleName,
    points: r.pointsAdded,
    percentageOfTotal: totalScore > 0 ? Math.round((r.pointsAdded / totalScore) * 100) : 0,
    explanation: r.explanation,
    details: r.details || {}
  })).sort((a, b) => b.points - a.points);

  return {
    score: totalScore,
    riskLevel,
    status,
    actionTitle,
    summary,
    recommendation,
    factorBreakdown,
    ruleCount: triggeredRules.length,
    evaluatedAt: new Date().toISOString()
  };
}
