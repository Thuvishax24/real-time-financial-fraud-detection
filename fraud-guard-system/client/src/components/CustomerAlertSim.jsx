import React, { useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { Smartphone, ShieldAlert, CheckCircle, Ban, Send, Clock, User, Bell } from 'lucide-react';
import { apiFetch } from '../utils/api';

export default function CustomerAlertSim() {
  const { customerAlerts, refreshData } = useSocket();
  const [respondingId, setRespondingId] = useState(null);
  const [responseToast, setResponseToast] = useState(null);

  const handleResponse = async (alertId, responseType) => {
    setRespondingId(alertId);
    try {
      const res = await apiFetch(`/api/customer-alerts/${alertId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: responseType })
      }).then(r => r.json());

      if (res.success) {
        setResponseToast(
          responseType === 'CONFIRM_LEGITIMATE'
            ? 'Customer confirmed: "YES, this was me." Authorization noted for analyst review.'
            : 'Customer replied: "NO, freeze my card!" Account & cards FROZEN immediately.'
        );
        refreshData();
        setTimeout(() => setResponseToast(null), 4000);
      }
    } catch (err) {
      console.error('Customer response error:', err);
    } finally {
      setRespondingId(null);
    }
  };

  const activeAlerts = customerAlerts.filter(a => a.status === 'SENT');
  const pastAlerts = customerAlerts.filter(a => a.status !== 'SENT');

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
      {/* Header Info */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 bg-slate-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Smartphone className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-white tracking-tight">Customer Out-of-Band Security Verification</h2>
          </div>
          <p className="text-xs text-slate-400">
            Simulates instant multi-channel push and SMS security challenges sent directly to cardholders when anomalies trigger.
          </p>
        </div>

        {responseToast && (
          <div className="p-3 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-semibold flex items-center gap-2 animate-fade-in">
            <Bell className="w-4 h-4 flex-shrink-0 animate-bounce" />
            <span>{responseToast}</span>
          </div>
        )}
      </div>

      {/* Main Grid: Interactive Mobile Viewport + Historical Challenges */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT: Simulated Smartphone Device (6 cols) */}
        <div className="lg:col-span-6 flex justify-center">
          <div className="w-full max-w-sm rounded-[40px] border-4 border-slate-700 bg-black p-4 shadow-2xl relative overflow-hidden flex flex-col h-[650px]">
            {/* Phone Notch & Speaker */}
            <div className="w-32 h-5 bg-slate-800 rounded-b-xl mx-auto mb-4 flex items-center justify-center">
              <div className="w-10 h-1 bg-slate-600 rounded-full"></div>
            </div>

            {/* Mobile Header */}
            <div className="flex items-center justify-between text-slate-400 text-xs px-2 mb-3">
              <span className="font-semibold text-white">9:41</span>
              <div className="flex items-center gap-1.5 text-[10px] font-mono">
                <span>5G</span>
                <span>100%</span>
              </div>
            </div>

            <div className="flex items-center justify-between border-b border-slate-800 pb-2 px-2 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-cyan-600 flex items-center justify-center text-white font-bold text-xs">
                  FG
                </div>
                <div>
                  <div className="text-xs font-bold text-white">FraudGuard Security</div>
                  <div className="text-[10px] text-slate-500 font-mono">+1 (800) 555-0199</div>
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">SMS</span>
            </div>

            {/* Message Body Screen */}
            <div className="flex-1 overflow-y-auto space-y-3 px-1">
              {activeAlerts.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 text-xs">
                  <CheckCircle className="w-8 h-8 text-slate-600 mb-2" />
                  <p className="font-semibold text-slate-400">All Quiet</p>
                  <p className="mt-1">No pending customer security challenges. Trigger an attack or test transaction to simulate an alert.</p>
                </div>
              ) : (
                activeAlerts.map(alert => (
                  <div key={alert.id} className="p-3.5 rounded-2xl bg-slate-900 border border-amber-500/40 space-y-3 shadow-lg animate-fade-in">
                    <div className="flex items-center justify-between text-[11px] text-amber-400 font-bold">
                      <span className="flex items-center gap-1">
                        <ShieldAlert className="w-3.5 h-3.5" /> Security Challenge
                      </span>
                      <span className="text-slate-500 font-mono text-[10px]">Just now</span>
                    </div>

                    <div className="text-xs text-white leading-relaxed font-sans">
                      {alert.message}
                    </div>

                    <div className="bg-black/40 p-2 rounded-lg text-[11px] text-slate-300 font-mono border border-slate-800 flex justify-between">
                      <span>Cardholder:</span>
                      <span className="text-white font-bold">{alert.customer_name}</span>
                    </div>

                    {/* Interactive Mobile Response Buttons */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        onClick={() => handleResponse(alert.id, 'CONFIRM_LEGITIMATE')}
                        disabled={respondingId === alert.id}
                        className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow transition active:scale-95 disabled:opacity-50"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>YES, It Was Me</span>
                      </button>

                      <button
                        onClick={() => handleResponse(alert.id, 'REPORT_FRAUD')}
                        disabled={respondingId === alert.id}
                        className="py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow transition active:scale-95 disabled:opacity-50"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>NO - Freeze Card!</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Mobile Home Bar */}
            <div className="w-28 h-1 bg-slate-700 rounded-full mx-auto mt-3"></div>
          </div>
        </div>

        {/* RIGHT: History of Customer Responses (6 cols) */}
        <div className="lg:col-span-6 glass-panel rounded-2xl border border-slate-800 p-6 flex flex-col h-[650px]">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              Customer Verification Log
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              {customerAlerts.length} Total Dispatched
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {customerAlerts.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No alerts logged yet.
              </div>
            ) : (
              customerAlerts.map(alert => {
                const isReportedFraud = alert.status === 'REPORTED_FRAUD';
                const isVerified = alert.status === 'VERIFIED_LEGITIMATE';
                const isPending = alert.status === 'SENT';

                return (
                  <div key={alert.id} className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/40 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{alert.customer_name}</span>
                        <span className="font-mono text-slate-500 text-[11px]">{alert.phone_or_email}</span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isReportedFraud ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                        isVerified ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                        'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}>
                        {alert.status}
                      </span>
                    </div>

                    <p className="text-slate-400 font-mono text-[11px] leading-relaxed">
                      "{alert.message}"
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-800/60 pt-2 font-mono">
                      <span>Tx: {alert.transaction_id}</span>
                      <span>{new Date(alert.sent_at).toLocaleTimeString()}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
