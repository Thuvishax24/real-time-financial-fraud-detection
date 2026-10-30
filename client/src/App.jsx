import React, { useState } from 'react';
import { SocketProvider, useSocket } from './context/SocketContext';
import Navbar from './components/Navbar';
import MetricCards from './components/MetricCards';
import AttackScenarioBar from './components/AttackScenarioBar';
import LiveTransactionFeed from './components/LiveTransactionFeed';
import ExplainabilityModal from './components/ExplainabilityModal';
import AnalystHub from './components/AnalystHub';
import CustomerAlertSim from './components/CustomerAlertSim';
import RuleConfigModal from './components/RuleConfigModal';
import ManualTransactionModal from './components/ManualTransactionModal';
import AuditTrailView from './components/AuditTrailView';
import { ShieldAlert, AlertTriangle, X, Eye } from 'lucide-react';
import { apiFetch } from './utils/api';

function DashboardContent() {
  const [activeTab, setActiveTab] = useState('feed');
  const [selectedTx, setSelectedTx] = useState(null);
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const { activeAlert, setActiveAlert, refreshData } = useSocket();

  const handleSelectTxById = async (txId) => {
    try {
      const res = await apiFetch(`/api/transactions/${txId}`).then(r => r.json());
      if (res.success) {
        setSelectedTx(res.data);
      }
    } catch (e) {
      console.error('Failed to load transaction:', e);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30">
      
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenRuleModal={() => setIsRuleModalOpen(true)}
        onOpenManualModal={() => setIsManualModalOpen(true)}
      />

      {/* Global Real-Time Critical Alert Banner */}
      {activeAlert && (
        <div className="bg-gradient-to-r from-rose-950 via-rose-900 to-rose-950 border-b border-rose-500/50 py-2.5 px-4 shadow-lg animate-bounce-subtle">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 text-xs text-rose-200">
              <span className="p-1 rounded bg-rose-500/30 text-rose-300">
                <ShieldAlert className="w-4 h-4 animate-pulse" />
              </span>
              <span className="font-bold text-white uppercase tracking-wider font-mono">
                {activeAlert.explainability?.actionTitle || 'HIGH RISK FRAUD ALERT'}
              </span>
              <span className="hidden sm:inline text-rose-300">
                — {activeAlert.transaction.merchant_name} (${activeAlert.transaction.amount?.toFixed(2)}) for {activeAlert.transaction.customer_name}.
              </span>
              <span className="font-mono font-bold px-2 py-0.5 rounded bg-rose-500/40 text-white">
                Score: {activeAlert.explainability?.score}/100
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setSelectedTx(activeAlert.transaction);
                  setActiveAlert(null);
                }}
                className="flex items-center gap-1 px-3 py-1 rounded bg-white text-rose-900 font-bold text-xs hover:bg-rose-100 transition shadow"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Investigate</span>
              </button>
              <button
                onClick={() => setActiveAlert(null)}
                className="text-rose-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* KPI Metrics Strip */}
        <MetricCards />

        {/* Live Attack Simulator Toolbar */}
        <AttackScenarioBar />

        {/* Tab Views */}
        {activeTab === 'feed' && (
          <LiveTransactionFeed onSelectTransaction={(tx) => setSelectedTx(tx)} />
        )}

        {activeTab === 'analyst' && (
          <AnalystHub onSelectTransaction={(tx) => setSelectedTx(tx)} />
        )}

        {activeTab === 'customer-alerts' && (
          <CustomerAlertSim />
        )}

        {activeTab === 'audit' && (
          <AuditTrailView onSelectTransactionById={handleSelectTxById} />
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-4 px-6 text-center text-xs text-slate-500 font-mono">
        FraudGuard AI • Real-Time Transaction Monitoring & Explainable Fraud Engine • Enterprise Edition
      </footer>

      {/* Modals */}
      {selectedTx && (
        <ExplainabilityModal
          transaction={selectedTx}
          onClose={() => setSelectedTx(null)}
          onRefresh={refreshData}
        />
      )}

      <RuleConfigModal
        isOpen={isRuleModalOpen}
        onClose={() => setIsRuleModalOpen(false)}
      />

      <ManualTransactionModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        onEvaluated={(newTx) => setSelectedTx(newTx)}
      />

    </div>
  );
}

export default function App() {
  return (
    <SocketProvider>
      <DashboardContent />
    </SocketProvider>
  );
}
