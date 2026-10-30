import React, { useState } from 'react';
import { Zap, Globe, Lock, CreditCard, Moon, Gauge, Sparkles, CheckCircle2 } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { apiFetch } from '../utils/api';

export default function AttackScenarioBar() {
  const { simulatorState, setSimulatorState } = useSocket();
  const [injecting, setInjecting] = useState(null);
  const [lastInjected, setLastInjected] = useState(null);

  const handleSpeedChange = async (ms) => {
    try {
      const res = await apiFetch('/api/simulator/speed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intervalMs: ms })
      }).then(r => r.json());

      if (res.success) {
        setSimulatorState(prev => ({ ...prev, intervalMs: ms }));
      }
    } catch (err) {
      console.error('Failed to change speed:', err);
    }
  };

  const handleInject = async (scenario, label) => {
    setInjecting(scenario);
    try {
      const res = await apiFetch('/api/simulator/inject-attack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario })
      }).then(r => r.json());

      if (res.success) {
        setLastInjected(label);
        setTimeout(() => setLastInjected(null), 4000);
      }
    } catch (err) {
      console.error('Failed to inject attack:', err);
    } finally {
      setInjecting(null);
    }
  };

  return (
    <div className="glass-panel p-4 rounded-xl border border-slate-800 mb-6 bg-slate-900/60 relative overflow-hidden">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        
        {/* Left: Section Header & Speed controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white">Live Attack & Anomaly Simulator</span>
                {lastInjected && (
                  <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-fade-in font-medium">
                    <CheckCircle2 className="w-3 h-3" />
                    Injected: {lastInjected}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">Inject real-world fraud vectors to evaluate the rule engine in real-time</p>
            </div>
          </div>

          {/* Speed Selector */}
          <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-lg border border-slate-700/60 text-xs ml-auto lg:ml-4">
            <span className="text-slate-400 text-[11px] px-1.5 font-medium flex items-center gap-1">
              <Gauge className="w-3 h-3 text-cyan-400" /> Rate:
            </span>
            <button
              onClick={() => handleSpeedChange(3000)}
              className={`px-2 py-0.5 rounded font-mono transition ${
                simulatorState.intervalMs === 3000 ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40' : 'text-slate-400 hover:text-white'
              }`}
            >
              0.5x
            </button>
            <button
              onClick={() => handleSpeedChange(2000)}
              className={`px-2 py-0.5 rounded font-mono transition ${
                simulatorState.intervalMs === 2000 ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40' : 'text-slate-400 hover:text-white'
              }`}
            >
              1.0x
            </button>
            <button
              onClick={() => handleSpeedChange(800)}
              className={`px-2 py-0.5 rounded font-mono transition ${
                simulatorState.intervalMs === 800 ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40' : 'text-slate-400 hover:text-white'
              }`}
            >
              2.5x
            </button>
          </div>
        </div>

        {/* Right: Quick Attack Scenario Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* 1. Impossible Travel */}
          <button
            onClick={() => handleInject('IMPOSSIBLE_TRAVEL', 'Impossible Travel (Teleportation)')}
            disabled={injecting !== null}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:border-rose-500/50 transition shadow-sm active:scale-95 disabled:opacity-50"
            title="Elena Rostova: London then Singapore in 12 mins (Speed > 40,000 km/h)"
          >
            <Globe className="w-3.5 h-3.5 text-rose-400" />
            <span>Impossible Travel</span>
          </button>

          {/* 2. Account Takeover */}
          <button
            onClick={() => handleInject('ACCOUNT_TAKEOVER_WIRE', 'Dormant Wire Takeover')}
            disabled={injecting !== null}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:border-amber-500/50 transition shadow-sm active:scale-95 disabled:opacity-50"
            title="David Miller: Dormant for 42 days, sudden $8,750 wire to Panama Crypto"
          >
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>Account Takeover</span>
          </button>

          {/* 3. Card Testing */}
          <button
            onClick={() => handleInject('CARD_TESTING_BURST', 'Card Testing Micro-Charges')}
            disabled={injecting !== null}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hover:border-indigo-500/50 transition shadow-sm active:scale-95 disabled:opacity-50"
            title="Frank Thorne: 5 rapid micro-charges ($1-$3) within 10 seconds"
          >
            <CreditCard className="w-3.5 h-3.5 text-indigo-400" />
            <span>Card Testing Bot</span>
          </button>

          {/* 4. Midnight Gambling */}
          <button
            onClick={() => handleInject('MIDNIGHT_HIGH_VALUE_GAMBLING', 'Midnight Offshore Casino')}
            disabled={injecting !== null}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:border-purple-500/50 transition shadow-sm active:scale-95 disabled:opacity-50"
            title="Alice Walker: 3:15 AM $5,400 charge to Curacao Casino"
          >
            <Moon className="w-3.5 h-3.5 text-purple-400" />
            <span>Midnight Gambling</span>
          </button>
        </div>

      </div>
    </div>
  );
}
