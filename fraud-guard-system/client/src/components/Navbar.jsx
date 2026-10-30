import React from 'react';
import { ShieldAlert, Activity, Play, Square, Sliders, FileText, Smartphone, PlusCircle, UserCheck } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { apiFetch } from '../utils/api';

export default function Navbar({ activeTab, setActiveTab, onOpenManualModal, onOpenRuleModal }) {
  const { isConnected, simulatorState, setSimulatorState } = useSocket();

  const toggleSimulator = async () => {
    try {
      const endpoint = simulatorState.isRunning ? '/api/simulator/stop' : '/api/simulator/start';
      const res = await apiFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intervalMs: simulatorState.intervalMs || 2000 })
      }).then(r => r.json());

      if (res.success) {
        setSimulatorState(prev => ({ ...prev, isRunning: !prev.isRunning }));
      }
    } catch (err) {
      console.error('Failed to toggle simulator:', err);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[#0B0F19]/90 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-8 py-3 transition-colors">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Brand & Connection Status */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 shadow-lg shadow-cyan-500/20 text-white">
              <ShieldAlert className="w-5 h-5 text-white" />
              {simulatorState.isRunning && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-white tracking-tight">FraudGuard<span className="text-cyan-400">AI</span></span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-mono">v2.4 Live</span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">Real-Time Transaction Monitoring & Risk Engine</p>
            </div>
          </div>

          {/* WS Status Badge */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
            <span className={`font-medium ${isConnected ? 'text-emerald-400' : 'text-amber-400'}`}>
              {isConnected ? 'Stream Active' : 'Connecting...'}
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs sm:text-sm overflow-x-auto max-w-full">
          <button
            onClick={() => setActiveTab('feed')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'feed'
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Live Stream</span>
          </button>

          <button
            onClick={() => setActiveTab('analyst')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'analyst'
                ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Analyst Queue</span>
          </button>

          <button
            onClick={() => setActiveTab('customer-alerts')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'customer-alerts'
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Mobile Alerts</span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'audit'
                ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Audit Trail</span>
          </button>
        </nav>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          {/* Simulator Toggle */}
          <button
            onClick={toggleSimulator}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm ${
              simulatorState.isRunning
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
            }`}
          >
            {simulatorState.isRunning ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{simulatorState.isRunning ? 'Pause Feed' : 'Start Feed'}</span>
          </button>

          {/* Rule Tuner Modal Trigger */}
          <button
            onClick={onOpenRuleModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            title="Configure Rule Engine Weights"
          >
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Rule Tuner</span>
          </button>

          {/* Manual Transaction Trigger */}
          <button
            onClick={onOpenManualModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-600/20 transition"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Test Tx</span>
          </button>
        </div>

      </div>
    </header>
  );
}
