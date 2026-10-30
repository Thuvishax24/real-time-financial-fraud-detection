import React, { useState, useEffect } from 'react';
import { FileText, Search, Shield, User, Clock, ArrowDownRight, RefreshCw } from 'lucide-react';
import { apiFetch } from '../utils/api';

export default function AuditTrailView({ onSelectTransactionById }) {
  const [logs, setLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [actorFilter, setActorFilter] = useState('ALL');
  const [loading, setLoading] = useState(false);

  const fetchLogs = () => {
    setLoading(true);
    apiFetch('/api/audit-logs?limit=100')
      .then(r => r.json())
      .then(res => {
        if (res.success) setLogs(res.data);
      })
      .catch(err => console.error('Failed to load audit logs:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filtered = logs.filter(l => {
    const matchesSearch =
      (l.action || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.details || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.transaction_id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.actor || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesActor = actorFilter === 'ALL' || l.actor.includes(actorFilter);
    return matchesSearch && matchesActor;
  });

  return (
    <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl max-w-6xl mx-auto space-y-4 p-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <FileText className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-white tracking-tight">System & Investigation Audit Trail</h2>
          </div>
          <p className="text-xs text-slate-400">
            Immutable, timestamped record of all automated risk evaluations, analyst interventions, customer challenges & rule updates.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search action, actor, transaction ID, details..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500"
          />
        </div>

        <select
          value={actorFilter}
          onChange={(e) => setActorFilter(e.target.value)}
          className="px-3 py-1.5 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-300 focus:outline-none focus:border-purple-500 w-full sm:w-auto"
        >
          <option value="ALL">All Actors</option>
          <option value="SYSTEM_RULE_ENGINE">System Rule Engine</option>
          <option value="ANALYST">Fraud Analysts</option>
          <option value="CUSTOMER">Customer Mobile Response</option>
          <option value="SYSTEM_ADMIN">Admin Config</option>
        </select>
      </div>

      {/* Audit Log Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/40">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
              <th className="py-3 px-4">Timestamp</th>
              <th className="py-3 px-4">Action</th>
              <th className="py-3 px-4">Actor</th>
              <th className="py-3 px-4">Details</th>
              <th className="py-3 px-4 text-right">Reference</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40 font-sans">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="5" className="py-12 text-center text-slate-500 text-sm">
                  No audit logs found matching criteria.
                </td>
              </tr>
            ) : (
              filtered.map((log) => {
                const isAutoBlock = log.action.includes('BLOCKED');
                const isCleared = log.action.includes('CLEARED') || log.action.includes('APPROVED');
                const isFraudConfirmed = log.action.includes('FRAUD');
                const isCustomer = log.actor.includes('CUSTOMER');

                return (
                  <tr key={log.id} className="hover:bg-slate-900/40 transition">
                    <td className="py-3 px-4 whitespace-nowrap font-mono text-slate-400 text-[11px]">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        isAutoBlock || isFraudConfirmed ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                        isCleared ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                        isCustomer ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                        'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      }`}>
                        {log.action}
                      </span>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-300">
                      {log.actor}
                    </td>

                    <td className="py-3 px-4 text-slate-300 max-w-md">
                      <p className="line-clamp-2">{log.details}</p>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap text-right font-mono text-slate-400">
                      {log.transaction_id ? (
                        <button
                          onClick={() => onSelectTransactionById(log.transaction_id)}
                          className="text-cyan-400 hover:text-cyan-300 hover:underline flex items-center justify-end gap-1 ml-auto"
                        >
                          <span>{log.transaction_id}</span>
                          <ArrowDownRight className="w-3 h-3" />
                        </button>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}
