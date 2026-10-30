import React, { useState } from 'react';
import { X, Sliders, CheckCircle2, Shield, Save, RotateCcw } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { apiFetch } from '../utils/api';

export default function RuleConfigModal({ isOpen, onClose }) {
  const { rules, setRules } = useSocket();
  const [localRules, setLocalRules] = useState(rules);
  const [savingCode, setSavingCode] = useState(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Sync when opened
  React.useEffect(() => {
    setLocalRules(rules);
  }, [rules, isOpen]);

  if (!isOpen) return null;

  const handleWeightChange = (code, val) => {
    setLocalRules(prev => prev.map(r => r.code === code ? { ...r, weight: Number(val) } : r));
  };

  const handleThresholdChange = (code, val) => {
    setLocalRules(prev => prev.map(r => r.code === code ? { ...r, threshold: Number(val) } : r));
  };

  const handleToggle = (code) => {
    setLocalRules(prev => prev.map(r => r.code === code ? { ...r, enabled: r.enabled ? 0 : 1 } : r));
  };

  const saveRule = async (rule) => {
    setSavingCode(rule.code);
    try {
      const res = await apiFetch(`/api/rules/${rule.code}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weight: rule.weight,
          threshold: rule.threshold,
          enabled: rule.enabled === 1,
          time_window_seconds: rule.time_window_seconds
        })
      }).then(r => r.json());

      if (res.success) {
        setRules(prev => prev.map(r => r.code === rule.code ? res.data : r));
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 2500);
      }
    } catch (err) {
      console.error('Failed to update rule:', err);
    } finally {
      setSavingCode(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-[#0F172A] border border-slate-700/80 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl relative text-slate-200">
        
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#0F172A]/95 backdrop-blur-md px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Fraud Rule Engine & Scoring Tuner</h3>
              <p className="text-xs text-slate-400">Calibrate rule weights, velocity windows, and detection thresholds in real time</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {savedSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>Rule configuration saved and applied to live engine immediately!</span>
            </div>
          )}

          <div className="space-y-3">
            {localRules.map((rule) => {
              const isEnabled = rule.enabled === 1;

              return (
                <div
                  key={rule.code}
                  className={`p-4 rounded-xl border transition-all ${
                    isEnabled
                      ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                      : 'bg-slate-950/40 border-slate-900 opacity-60'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{rule.name}</span>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                        {rule.code}
                      </span>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                        {rule.category}
                      </span>
                    </div>

                    {/* Enable Toggle & Save */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggle(rule.code)}
                        className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition ${
                          isEnabled
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {isEnabled ? 'Enabled' : 'Disabled'}
                      </button>

                      <button
                        onClick={() => saveRule(rule)}
                        disabled={savingCode === rule.code}
                        className="flex items-center gap-1 text-xs px-3 py-1 rounded-lg font-semibold bg-cyan-600 hover:bg-cyan-500 text-white transition disabled:opacity-50"
                      >
                        <Save className="w-3 h-3" />
                        <span>Save</span>
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed mb-3">
                    {rule.description}
                  </p>

                  {/* Sliders */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950/60 p-3 rounded-lg border border-slate-800/80 text-xs">
                    {/* Weight Slider */}
                    <div>
                      <div className="flex items-center justify-between mb-1 text-slate-300">
                        <span>Risk Weight (Points):</span>
                        <span className="font-mono font-bold text-cyan-400">+{rule.weight} pts</span>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="75"
                        step="5"
                        value={rule.weight}
                        disabled={!isEnabled}
                        onChange={(e) => handleWeightChange(rule.code, e.target.value)}
                        className="w-full accent-cyan-500 cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-0.5">
                        <span>5 pts</span>
                        <span>40 pts</span>
                        <span>75 pts</span>
                      </div>
                    </div>

                    {/* Threshold display or slider */}
                    <div>
                      <div className="flex items-center justify-between mb-1 text-slate-300">
                        <span>Trigger Threshold:</span>
                        <span className="font-mono font-bold text-amber-400">
                          {rule.code === 'AMOUNT_ANOMALY' ? `${rule.threshold}x Avg` :
                           rule.code === 'GEO_IMPOSSIBLE' ? `${rule.threshold} km/h` :
                           rule.code === 'VELOCITY_SPIKE' ? `> ${rule.threshold} txs / 2m` :
                           rule.threshold ? rule.threshold : 'Heuristic'}
                        </span>
                      </div>
                      {rule.code === 'AMOUNT_ANOMALY' ? (
                        <input
                          type="range"
                          min="1.5"
                          max="8.0"
                          step="0.5"
                          value={rule.threshold}
                          disabled={!isEnabled}
                          onChange={(e) => handleThresholdChange(rule.code, e.target.value)}
                          className="w-full accent-amber-500 cursor-pointer"
                        />
                      ) : rule.code === 'GEO_IMPOSSIBLE' ? (
                        <input
                          type="range"
                          min="500"
                          max="1500"
                          step="100"
                          value={rule.threshold}
                          disabled={!isEnabled}
                          onChange={(e) => handleThresholdChange(rule.code, e.target.value)}
                          className="w-full accent-amber-500 cursor-pointer"
                        />
                      ) : (
                        <div className="text-[11px] text-slate-500 pt-2 font-mono">
                          Hardcoded security heuristic logic
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </div>

      </div>
    </div>
  );
}
