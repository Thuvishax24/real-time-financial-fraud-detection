import React, { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import { UserCheck, ShieldAlert, ShieldCheck, AlertTriangle, Clock, MapPin, User, CheckCircle, Ban, Send, RefreshCw, FileText } from 'lucide-react';
import { apiFetch } from '../utils/api';

export default function AnalystHub({ onSelectTransaction }) {
  const { investigations, setInvestigations, refreshData } = useSocket();
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [activeCaseDetails, setActiveCaseDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [analystName, setAnalystName] = useState('Agent Sarah Chen');
  const [noteText, setNoteText] = useState('');
  const [resolutionReason, setResolutionReason] = useState('');
  const [actionMessage, setActionMessage] = useState(null);
  const [statusFilter, setStatusFilter] = useState('PENDING');

  // Select first case by default if none selected
  useEffect(() => {
    if (investigations.length > 0 && !selectedCaseId) {
      setSelectedCaseId(investigations[0].id);
    }
  }, [investigations]);

  // Fetch full details of selected investigation
  useEffect(() => {
    if (!selectedCaseId) return;
    setLoadingDetails(true);
    apiFetch(`/api/investigations/${selectedCaseId}`)
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          setActiveCaseDetails(res.data);
          if (res.data.assigned_analyst && res.data.assigned_analyst !== 'Unassigned') {
            setAnalystName(res.data.assigned_analyst);
          }
        }
      })
      .catch(err => console.error('Failed to load case:', err))
      .finally(() => setLoadingDetails(false));
  }, [selectedCaseId]);

  const filteredQueue = investigations.filter(inv => {
    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'PENDING') return inv.status === 'PENDING' || inv.status === 'UNDER_REVIEW';
    if (statusFilter === 'RESOLVED') return inv.status === 'CONFIRMED_FRAUD' || inv.status === 'FALSE_POSITIVE_CLEARED';
    return inv.status === statusFilter;
  });

  const handleCaseAction = async (actionType) => {
    if (!selectedCaseId) return;
    try {
      const res = await apiFetch(`/api/investigations/${selectedCaseId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: actionType,
          analystName,
          notes: noteText,
          reason: resolutionReason || (actionType === 'RELEASE_AND_APPROVE' ? 'Customer verified transaction' : 'Unauthorized intrusion confirmed')
        })
      }).then(r => r.json());

      if (res.success) {
        setActionMessage(`Action successful: Case updated to ${res.data.status}`);
        setNoteText('');
        setResolutionReason('');
        // Refresh case
        const updatedCase = await apiFetch(`/api/investigations/${selectedCaseId}`).then(r => r.json());
        if (updatedCase.success) setActiveCaseDetails(updatedCase.data);
        refreshData();
        setTimeout(() => setActionMessage(null), 3500);
      }
    } catch (err) {
      console.error('Case action error:', err);
    }
  };

  const handleUnfreezeCustomer = async (customerId) => {
    try {
      const res = await apiFetch(`/api/customers/${customerId}/unfreeze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analystName })
      }).then(r => r.json());

      if (res.success) {
        setActionMessage(`Customer ${customerId} and accounts successfully restored to ACTIVE.`);
        const updatedCase = await apiFetch(`/api/investigations/${selectedCaseId}`).then(r => r.json());
        if (updatedCase.success) setActiveCaseDetails(updatedCase.data);
        refreshData();
        setTimeout(() => setActionMessage(null), 3500);
      }
    } catch (err) {
      console.error('Unfreeze error:', err);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* LEFT: Case Queue (4 cols) */}
      <div className="lg:col-span-4 glass-panel rounded-xl border border-slate-800 p-4 space-y-4 flex flex-col h-[750px]">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-white tracking-tight">Investigation Queue</h3>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 font-mono">
            {filteredQueue.length} cases
          </span>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => setStatusFilter('PENDING')}
            className={`flex-1 py-1 rounded font-medium transition ${
              statusFilter === 'PENDING' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Pending / Active
          </button>
          <button
            onClick={() => setStatusFilter('RESOLVED')}
            className={`flex-1 py-1 rounded font-medium transition ${
              statusFilter === 'RESOLVED' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Resolved
          </button>
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`flex-1 py-1 rounded font-medium transition ${
              statusFilter === 'ALL' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            All
          </button>
        </div>

        {/* Queue Items */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {filteredQueue.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              No cases matching filter.
            </div>
          ) : (
            filteredQueue.map(inv => {
              const isSelected = inv.id === selectedCaseId;
              const isCritical = inv.priority === 'CRITICAL';
              const isResolved = inv.status === 'CONFIRMED_FRAUD' || inv.status === 'FALSE_POSITIVE_CLEARED';

              return (
                <div
                  key={inv.id}
                  onClick={() => setSelectedCaseId(inv.id)}
                  className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-indigo-950/40 border-indigo-500/60 shadow-md'
                      : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span className="font-mono text-slate-300 font-semibold">{inv.id}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isCritical ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    }`}>
                      {inv.priority}
                    </span>
                  </div>

                  <div className="font-medium text-white text-sm truncate">{inv.customer_name}</div>
                  <div className="flex items-center justify-between text-slate-400 mt-1">
                    <span>{inv.merchant_name}</span>
                    <span className="font-mono font-bold text-slate-200">${inv.amount?.toFixed(2)}</span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-800/60 font-mono">
                    <span className={`${
                      inv.status === 'CONFIRMED_FRAUD' ? 'text-rose-400 font-bold' :
                      inv.status === 'FALSE_POSITIVE_CLEARED' ? 'text-emerald-400 font-bold' :
                      inv.status === 'UNDER_REVIEW' ? 'text-cyan-400' : 'text-amber-400'
                    }`}>
                      {inv.status}
                    </span>
                    <span>Score: {inv.risk_score}/100</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT: Active Case Workspace (8 cols) */}
      <div className="lg:col-span-8 glass-panel rounded-xl border border-slate-800 p-6 flex flex-col h-[750px] overflow-y-auto">
        {!activeCaseDetails ? (
          <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
            Select a case from the queue to start investigation.
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Case Title Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {activeCaseDetails.id}
                  </span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    activeCaseDetails.status === 'CONFIRMED_FRAUD' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                    activeCaseDetails.status === 'FALSE_POSITIVE_CLEARED' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                    'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  }`}>
                    {activeCaseDetails.status}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-white tracking-tight">
                  Investigation for {activeCaseDetails.customer_name}
                </h2>
              </div>

              {/* Analyst Assigner */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Analyst:</span>
                <select
                  value={analystName}
                  onChange={(e) => {
                    setAnalystName(e.target.value);
                    handleCaseAction('ASSIGN_ANALYST');
                  }}
                  className="px-2.5 py-1.5 text-xs rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="Agent Sarah Chen">Agent Sarah Chen (Lead)</option>
                  <option value="Agent Michael Chang">Agent Michael Chang</option>
                  <option value="Agent Alex Rivera">Agent Alex Rivera</option>
                </select>
              </div>
            </div>

            {/* Notification Banner */}
            {actionMessage && (
              <div className="p-3 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-semibold flex items-center gap-2 animate-fade-in">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                <span>{actionMessage}</span>
              </div>
            )}

            {/* Customer & Account Details Card */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-cyan-400" /> Customer Information
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded font-mono font-bold ${
                    activeCaseDetails.customer_status === 'FROZEN' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' : 'bg-emerald-500/20 text-emerald-400'
                  }`}>
                    {activeCaseDetails.customer_status}
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="text-sm font-semibold text-white">{activeCaseDetails.customer_name}</div>
                  <div className="text-slate-400 font-mono">{activeCaseDetails.customer_email} • {activeCaseDetails.customer_phone}</div>
                  <div className="text-slate-400 pt-1">
                    Home Location: <span className="text-slate-200">{activeCaseDetails.primary_city}</span>
                  </div>
                  <div className="text-slate-400">
                    Typical Avg Spend: <span className="text-slate-200 font-mono">${(activeCaseDetails.avg_transaction_amount || 0).toFixed(2)}</span>
                  </div>
                  {activeCaseDetails.customer_status === 'FROZEN' && (
                    <div className="pt-2">
                      <button
                        onClick={() => handleUnfreezeCustomer(activeCaseDetails.customer_id)}
                        className="px-2.5 py-1 text-xs font-semibold rounded bg-cyan-600/30 text-cyan-300 border border-cyan-500/50 hover:bg-cyan-600/50 transition"
                      >
                        Unfreeze Customer & Account
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Transaction Under Investigation */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-amber-400" /> Flagged Transaction
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                    Risk Score: {activeCaseDetails.risk_score}/100
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="text-lg font-bold text-white font-mono">${activeCaseDetails.amount?.toFixed(2)} {activeCaseDetails.currency}</div>
                  <div className="text-slate-300">{activeCaseDetails.merchant_name} ({activeCaseDetails.merchant_category})</div>
                  <div className="text-slate-400">Location: <span className="text-slate-200">{activeCaseDetails.location_city}, {activeCaseDetails.location_country}</span></div>
                  <div className="text-slate-400 font-mono">Device: {activeCaseDetails.device_os} ({activeCaseDetails.is_trusted_device ? 'Trusted' : 'Untrusted'})</div>
                </div>
              </div>
            </div>

            {/* Explainability Breakdown */}
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60">
              <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-2">
                Triggered Rule Findings & Mathematical Rationale
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed mb-3">
                {activeCaseDetails.explainability_summary}
              </p>
              <div className="space-y-2">
                {activeCaseDetails.triggered_rules?.map((r, i) => (
                  <div key={i} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold text-white">{r.ruleName}</div>
                      <div className="text-slate-400 mt-0.5">{r.explanation}</div>
                    </div>
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 whitespace-nowrap">
                      +{r.pointsAdded || r.weight} pts
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Customer Security SMS Status */}
            {activeCaseDetails.customer_notification && (
              <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-950/10 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-300 flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5" /> Out-of-Band Security SMS Sent
                  </span>
                  <span className="font-mono font-semibold px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
                    {activeCaseDetails.customer_notification.status}
                  </span>
                </div>
                <p className="text-slate-400 font-mono text-[11px]">
                  "{activeCaseDetails.customer_notification.message}"
                </p>
              </div>
            )}

            {/* Analyst Decision & Notes Workspace */}
            <div className="p-4 rounded-xl border border-indigo-500/40 bg-indigo-950/20 space-y-3">
              <h4 className="text-xs font-bold uppercase text-indigo-300 tracking-wider">
                Analyst Resolution & Action
              </h4>

              <div className="space-y-2">
                <label className="text-xs text-slate-400 block font-medium">Investigation Notes & Evidence:</label>
                <textarea
                  rows={2}
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Record customer phone verification details, passport match, IP review..."
                  className="w-full p-2.5 text-xs rounded-lg bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-sans"
                />
              </div>

              {activeCaseDetails.analyst_notes && (
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
                  <span className="text-[11px] font-bold text-slate-400 block mb-1">Previous Case Log:</span>
                  <pre className="text-slate-300 whitespace-pre-wrap font-sans text-xs">
                    {activeCaseDetails.analyst_notes}
                  </pre>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  onClick={() => handleCaseAction('ADD_NOTE')}
                  disabled={!noteText.trim()}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 disabled:opacity-40"
                >
                  Save Note
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCaseAction('RELEASE_AND_APPROVE')}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-900/30 transition"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Release & Approve Funds</span>
                  </button>

                  <button
                    onClick={() => handleCaseAction('CONFIRM_FRAUD_AND_FREEZE')}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-900/30 transition"
                  >
                    <Ban className="w-4 h-4" />
                    <span>Confirm Fraud & Freeze Account</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Case Audit Trail Log */}
            {activeCaseDetails.audit_logs && activeCaseDetails.audit_logs.length > 0 && (
              <div className="space-y-2 border-t border-slate-800 pt-4">
                <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" /> Immutable Case Audit Trail ({activeCaseDetails.audit_logs.length})
                </h4>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {activeCaseDetails.audit_logs.map((log, i) => (
                    <div key={i} className="p-2 rounded bg-slate-900/80 border border-slate-800/80 text-[11px] flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-slate-200 font-mono">{log.action}</span>
                        <span className="text-slate-400 ml-2">by {log.actor}</span>
                        <p className="text-slate-400 mt-0.5">{log.details}</p>
                      </div>
                      <span className="text-slate-500 font-mono whitespace-nowrap ml-4">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}
      </div>

    </div>
  );
}
