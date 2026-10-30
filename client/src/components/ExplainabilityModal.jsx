import React, { useState } from 'react';
import { X, ShieldAlert, AlertTriangle, ShieldCheck, ArrowRight, MapPin, Smartphone, User, DollarSign, Clock, CheckCircle, Ban, Send } from 'lucide-react';
import { apiFetch } from '../utils/api';

export default function ExplainabilityModal({ transaction, onClose, onRefresh }) {
  if (!transaction) return null;

  const [actionLoading, setActionLoading] = useState(false);
  const [analystNotes, setAnalystNotes] = useState('');
  const [actionSuccess, setActionSuccess] = useState(null);

  const triggeredRules = transaction.triggered_rules || (transaction.triggered_rules_json ? JSON.parse(transaction.triggered_rules_json) : []);
  const score = transaction.risk_score || 0;
  const isBlocked = transaction.status === 'BLOCKED' || transaction.status === 'CONFIRMED_FRAUD';
  const isFlagged = transaction.status === 'FLAGGED';
  const isApproved = transaction.status === 'APPROVED' || transaction.status === 'CLEARED';

  // Handle analyst quick resolution
  const handleQuickAction = async (actionType) => {
    setActionLoading(true);
    try {
      // Find linked investigation
      const invRes = await apiFetch(`/api/investigations?limit=100`).then(r => r.json());
      const linkedInv = invRes.data?.find(i => i.transaction_id === transaction.id);

      if (!linkedInv) {
        alert('No active investigation case found for this transaction.');
        return;
      }

      const res = await apiFetch(`/api/investigations/${linkedInv.id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: actionType,
          analystName: 'Senior Risk Officer',
          notes: analystNotes || (actionType === 'RELEASE_AND_APPROVE' ? 'Manual review approved transaction.' : 'Confirmed malicious account takeover.'),
          reason: actionType === 'RELEASE_AND_APPROVE' ? 'False Positive Cleared' : 'Unauthorized Fraud Confirmed'
        })
      }).then(r => r.json());

      if (res.success) {
        setActionSuccess(`Transaction ${actionType === 'RELEASE_AND_APPROVE' ? 'CLEARED & UNBLOCKED' : 'CONFIRMED FRAUD & ACCOUNT FROZEN'}`);
        if (onRefresh) onRefresh();
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    } catch (err) {
      console.error('Quick action failed:', err);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-[#0F172A] border border-slate-700/80 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl relative text-slate-200">
        
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#0F172A]/95 backdrop-blur-md px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${isBlocked ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' : isFlagged ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'}`}>
              {isBlocked ? <ShieldAlert className="w-5 h-5" /> : isFlagged ? <AlertTriangle className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">Fraud Decision & Explainability Report</h3>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">{transaction.id}</span>
              </div>
              <p className="text-xs text-slate-400">Algorithmic risk score breakdown, baseline deviations & triggered rules</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">

          {/* 1. Score & Decision Banner */}
          <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-4 ${
            isBlocked
              ? 'bg-rose-950/20 border-rose-500/30'
              : isFlagged
              ? 'bg-amber-950/20 border-amber-500/30'
              : 'bg-emerald-950/20 border-emerald-500/30'
          }`}>
            <div className="flex items-center gap-4">
              {/* Circular Gauge Representation */}
              <div className="relative flex items-center justify-center w-20 h-20 rounded-full bg-slate-900 border-4 border-slate-800 shadow-inner flex-shrink-0">
                <div className="text-center">
                  <span className={`text-2xl font-bold font-mono ${
                    score >= 70 ? 'text-rose-400' : score >= 40 ? 'text-amber-400' : 'text-emerald-400'
                  }`}>
                    {score}
                  </span>
                  <span className="block text-[10px] text-slate-500 font-mono -mt-1">/100</span>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                    isBlocked
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : isFlagged
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  }`}>
                    {transaction.status} • {transaction.risk_level} RISK
                  </span>
                </div>
                <h4 className="text-lg font-bold text-white">
                  {isBlocked
                    ? 'Automated Block Enforced (Funds Held)'
                    : isFlagged
                    ? 'Flagged for Analyst Investigation'
                    : 'Transaction Approved by Rule Engine'}
                </h4>
                <p className="text-xs text-slate-400">
                  Evaluated at {new Date(transaction.timestamp).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="text-right sm:border-l sm:border-slate-800 sm:pl-6 w-full sm:w-auto">
              <span className="text-xs text-slate-400 block">Transaction Value</span>
              <span className="text-2xl font-bold font-mono text-white">${transaction.amount?.toFixed(2)}</span>
              <span className="text-xs text-slate-400 block font-mono">{transaction.currency || 'USD'} • {transaction.merchant_category}</span>
            </div>
          </div>

          {/* 2. Plain English Explainability Narrative */}
          <div className="glass-panel p-4 rounded-xl border border-slate-800 bg-slate-900/60">
            <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
              Plain-English Decision Narrative
            </h4>
            <p className="text-sm text-slate-200 leading-relaxed font-sans">
              {transaction.explainability_summary || 'Transaction analyzed against all heuristic security rules.'}
            </p>
          </div>

          {/* 3. Triggered Rules Breakdown */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                Triggered Rule Contributions ({triggeredRules.length})
              </h4>
              <span className="text-xs text-slate-500">Points contribute toward 0-100 scale</span>
            </div>

            {triggeredRules.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-slate-800 text-center text-slate-500 text-sm">
                No anomaly rules were triggered for this transaction. It passed all fraud filters.
              </div>
            ) : (
              <div className="space-y-2.5">
                {triggeredRules.map((rule, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/40 hover:border-slate-700 transition">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-white">{rule.ruleName}</span>
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                          {rule.ruleCode}
                        </span>
                      </div>
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        +{rule.pointsAdded || rule.weight} pts
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {rule.explanation}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 4. Customer Context & Baseline Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Customer Baseline */}
            <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/40">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-400 mb-1.5">
                <User className="w-3.5 h-3.5 text-cyan-400" />
                <span>Customer Profile</span>
              </div>
              <div className="font-semibold text-white text-sm">{transaction.customer_name || 'Customer'}</div>
              <div className="text-xs text-slate-400 font-mono mt-0.5">{transaction.customer_id}</div>
              <div className="text-xs text-slate-400 mt-2">
                Avg Historical Spend: <span className="text-slate-200 font-mono">${(transaction.customer_avg_amount || 85).toFixed(2)}</span>
              </div>
            </div>

            {/* Geolocation */}
            <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/40">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-400 mb-1.5">
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                <span>Location Context</span>
              </div>
              <div className="font-semibold text-white text-sm">{transaction.location_city}, {transaction.location_country}</div>
              <div className="text-xs text-slate-400 font-mono mt-0.5">IP: {transaction.ip_address || '198.51.100.24'}</div>
              <div className="text-xs text-slate-400 mt-2">
                Coords: <span className="text-slate-300 font-mono">{transaction.latitude?.toFixed(2)}, {transaction.longitude?.toFixed(2)}</span>
              </div>
            </div>

            {/* Device & Channel */}
            <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/40">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-400 mb-1.5">
                <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
                <span>Device & Security</span>
              </div>
              <div className="font-semibold text-white text-sm">{transaction.device_os || 'Unknown OS'}</div>
              <div className="text-xs text-slate-400 font-mono mt-0.5">{transaction.device_id || 'DEV-STANDARD'}</div>
              <div className="text-xs mt-2">
                {transaction.is_trusted_device ? (
                  <span className="text-emerald-400 font-medium">✓ Recognized Trusted Device</span>
                ) : (
                  <span className="text-rose-400 font-medium">⚠ Unrecognized / Untrusted Device</span>
                )}
              </div>
            </div>
          </div>

          {/* 5. Analyst Action Bar (If Flagged or Blocked) */}
          {(isBlocked || isFlagged) && (
            <div className="p-4 rounded-xl border border-indigo-500/30 bg-indigo-950/20 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase text-indigo-300 tracking-wider">
                  Analyst Decision & Resolution
                </h4>
                {actionSuccess && (
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    {actionSuccess}
                  </span>
                )}
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Enter analyst investigation notes (e.g. 'Verified customer passport/phone', 'Customer reported stolen card')..."
                  value={analystNotes}
                  onChange={(e) => setAnalystNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                <button
                  onClick={() => handleQuickAction('RELEASE_AND_APPROVE')}
                  disabled={actionLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-sm disabled:opacity-50"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Release & Approve Funds</span>
                </button>

                <button
                  onClick={() => handleQuickAction('CONFIRM_FRAUD_AND_FREEZE')}
                  disabled={actionLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition shadow-sm disabled:opacity-50"
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>Confirm Fraud & Freeze Account</span>
                </button>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
