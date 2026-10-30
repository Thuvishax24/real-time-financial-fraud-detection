import React, { useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { Search, Filter, ShieldAlert, ShieldCheck, AlertTriangle, Eye, ArrowUpRight, Globe, Lock, Ban } from 'lucide-react';

export default function LiveTransactionFeed({ onSelectTransaction }) {
  const { transactions } = useSocket();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [riskFilter, setRiskFilter] = useState('ALL');

  const filtered = transactions.filter(t => {
    const matchesSearch =
      (t.merchant_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.location_city || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.id || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    const matchesRisk = riskFilter === 'ALL' || t.risk_level === riskFilter;

    return matchesSearch && matchesStatus && matchesRisk;
  });

  return (
    <div className="glass-panel rounded-xl border border-slate-800 overflow-hidden shadow-xl">
      
      {/* Controls & Filter Bar */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/40 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search merchant, customer, city, ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
          <span className="text-xs text-slate-500 font-mono hidden sm:inline whitespace-nowrap">
            {filtered.length} of {transactions.length}
          </span>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="APPROVED">Approved</option>
            <option value="FLAGGED">Flagged</option>
            <option value="BLOCKED">Blocked</option>
            <option value="CLEARED">Cleared</option>
            <option value="CONFIRMED_FRAUD">Confirmed Fraud</option>
          </select>

          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Risk Tiers</option>
            <option value="LOW">Low Risk (0-39)</option>
            <option value="MEDIUM">Medium Risk (40-69)</option>
            <option value="HIGH">High Risk (70-100)</option>
          </select>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-800/80 bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
              <th className="py-3 px-4">Transaction / Time</th>
              <th className="py-3 px-4">Customer</th>
              <th className="py-3 px-4">Merchant & Category</th>
              <th className="py-3 px-4">Location</th>
              <th className="py-3 px-4 text-right">Amount</th>
              <th className="py-3 px-4 text-center">Risk Score</th>
              <th className="py-3 px-4 text-center">Decision</th>
              <th className="py-3 px-4">Triggered Signals</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50 font-sans">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="9" className="py-12 text-center text-slate-500 text-sm">
                  No transactions match the selected filters.
                </td>
              </tr>
            ) : (
              filtered.map((tx, idx) => {
                const triggeredRules = tx.triggered_rules || (tx.triggered_rules_json ? JSON.parse(tx.triggered_rules_json) : []);
                const score = tx.risk_score || 0;
                const isBlocked = tx.status === 'BLOCKED' || tx.status === 'CONFIRMED_FRAUD';
                const isFlagged = tx.status === 'FLAGGED';
                const isCleared = tx.status === 'CLEARED';

                return (
                  <tr
                    key={tx.id || idx}
                    className="hover:bg-slate-800/30 transition-colors group cursor-pointer"
                    onClick={() => onSelectTransaction(tx)}
                  >
                    {/* ID & Time */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-mono font-medium text-slate-200">{tx.id}</div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </div>
                    </td>

                    {/* Customer */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-medium text-slate-200">{tx.customer_name || 'Customer'}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{tx.customer_id}</div>
                    </td>

                    {/* Merchant & Category */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-medium text-slate-200">{tx.merchant_name}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                          {tx.merchant_category}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">({tx.channel})</span>
                      </div>
                    </td>

                    {/* Location */}
                    <td className="py-3 px-4 whitespace-nowrap text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <Globe className="w-3 h-3 text-slate-500" />
                        <span>{tx.location_city}, {tx.location_country}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        {tx.is_trusted_device ? 'Trusted device' : 'Foreign / Untrusted'}
                      </div>
                    </td>

                    {/* Amount */}
                    <td className="py-3 px-4 whitespace-nowrap text-right font-mono font-bold text-slate-100">
                      ${tx.amount?.toFixed(2)}
                      <span className="text-[10px] text-slate-500 font-normal ml-1">{tx.currency || 'USD'}</span>
                    </td>

                    {/* Risk Score Pill */}
                    <td className="py-3 px-4 whitespace-nowrap text-center">
                      <span className={`inline-flex items-center justify-center font-mono font-bold text-xs px-2.5 py-1 rounded-full ${
                        score >= 70
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm shadow-rose-900/30'
                          : score >= 40
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}>
                        {score}
                      </span>
                    </td>

                    {/* Decision Status */}
                    <td className="py-3 px-4 whitespace-nowrap text-center">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                        tx.status === 'BLOCKED'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : tx.status === 'CONFIRMED_FRAUD'
                          ? 'bg-red-950 text-red-400 border border-red-700'
                          : tx.status === 'FLAGGED'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : tx.status === 'CLEARED'
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      }`}>
                        {tx.status === 'BLOCKED' && <ShieldAlert className="w-3 h-3 text-rose-400" />}
                        {tx.status === 'FLAGGED' && <AlertTriangle className="w-3 h-3 text-amber-400" />}
                        {tx.status === 'APPROVED' && <ShieldCheck className="w-3 h-3 text-emerald-400" />}
                        {tx.status === 'CLEARED' && <ShieldCheck className="w-3 h-3 text-blue-400" />}
                        {tx.status === 'CONFIRMED_FRAUD' && <Ban className="w-3 h-3 text-red-400" />}
                        {tx.status}
                      </span>
                    </td>

                    {/* Triggered Signals */}
                    <td className="py-3 px-4">
                      {triggeredRules.length === 0 ? (
                        <span className="text-[11px] text-slate-500">None (Passed baseline)</span>
                      ) : (
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {triggeredRules.map((r, i) => (
                            <span key={i} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-rose-300 whitespace-nowrap">
                              +{r.pointsAdded || r.weight} {r.ruleCode.replace(/_/g, ' ')}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 whitespace-nowrap text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectTransaction(tx);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 transition"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Explain</span>
                      </button>
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
