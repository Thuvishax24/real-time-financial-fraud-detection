import React from 'react';
import { DollarSign, ShieldAlert, AlertTriangle, ShieldCheck, TrendingUp, CheckCircle, Flame } from 'lucide-react';
import { useSocket } from '../context/SocketContext';

export default function MetricCards() {
  const { stats } = useSocket();

  if (!stats) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6 animate-pulse">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-24 bg-slate-800/40 rounded-xl border border-slate-800"></div>
        ))}
      </div>
    );
  }

  const {
    totalTransactions = 0,
    totalVolume = 0,
    fraudRate = 0,
    preventedLoss = 0,
    pendingInvestigations = 0,
    averageRiskScore = 0,
    blockedCount = 0,
    flaggedCount = 0
  } = stats;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 mb-6">
      
      {/* 1. Total Volume Processed */}
      <div className="glass-panel p-4 rounded-xl border border-slate-800 hover:border-slate-700 transition relative overflow-hidden group">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-slate-400">Total Volume</span>
          <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
            <DollarSign className="w-4 h-4" />
          </div>
        </div>
        <div className="text-xl lg:text-2xl font-bold text-white tracking-tight font-mono">
          ${totalVolume.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
        </div>
        <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-400">
          <span className="font-semibold text-slate-300 font-mono">{totalTransactions}</span>
          <span>txs evaluated</span>
        </div>
        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-xl pointer-events-none"></div>
      </div>

      {/* 2. Prevented Losses ($ Protected) */}
      <div className="glass-panel p-4 rounded-xl border border-emerald-500/20 bg-emerald-950/10 hover:border-emerald-500/40 transition relative overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-emerald-400">Prevented Losses</span>
          <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>
        <div className="text-xl lg:text-2xl font-bold text-emerald-300 tracking-tight font-mono">
          ${preventedLoss.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
        </div>
        <div className="flex items-center gap-1.5 mt-1.5 text-xs text-emerald-400/80">
          <span className="font-semibold font-mono">{blockedCount}</span>
          <span>high-risk attacks blocked</span>
        </div>
        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl pointer-events-none"></div>
      </div>

      {/* 3. Fraud Detection Rate */}
      <div className="glass-panel p-4 rounded-xl border border-rose-500/20 bg-rose-950/10 hover:border-rose-500/40 transition relative overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-rose-400">Fraud Detection Rate</span>
          <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400">
            <Flame className="w-4 h-4" />
          </div>
        </div>
        <div className="text-xl lg:text-2xl font-bold text-rose-300 tracking-tight font-mono">
          {fraudRate}%
        </div>
        <div className="flex items-center gap-1.5 mt-1.5 text-xs text-rose-400/80">
          <span>Threshold &gt;40 Risk Score</span>
        </div>
        <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 rounded-full blur-xl pointer-events-none"></div>
      </div>

      {/* 4. Active Investigation Alerts */}
      <div className="glass-panel p-4 rounded-xl border border-amber-500/20 bg-amber-950/10 hover:border-amber-500/40 transition relative overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-amber-400">Analyst Queue</span>
          <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>
        <div className="text-xl lg:text-2xl font-bold text-amber-300 tracking-tight font-mono">
          {pendingInvestigations}
        </div>
        <div className="flex items-center gap-1.5 mt-1.5 text-xs text-amber-400/80">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
          <span>Requires review</span>
        </div>
        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-xl pointer-events-none"></div>
      </div>

      {/* 5. Average Risk Index */}
      <div className="glass-panel p-4 rounded-xl border border-cyan-500/20 hover:border-cyan-500/40 transition relative overflow-hidden col-span-2 lg:col-span-1">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-slate-400">Average Risk Index</span>
          <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <div className="text-xl lg:text-2xl font-bold text-cyan-400 tracking-tight font-mono">
            {averageRiskScore}
          </div>
          <span className="text-xs text-slate-500 font-mono">/ 100</span>
        </div>
        <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2.5 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              averageRiskScore < 40 ? 'bg-emerald-400' : averageRiskScore < 70 ? 'bg-amber-400' : 'bg-rose-500'
            }`}
            style={{ width: `${Math.min(100, averageRiskScore)}%` }}
          ></div>
        </div>
      </div>

    </div>
  );
}
