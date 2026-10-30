import React, { createContext, useContext, useEffect, useState, useRef } from 'react';

import { apiFetch } from '../utils/api';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const [isConnected, setIsConnected] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [activeAlert, setActiveAlert] = useState(null);
  const [stats, setStats] = useState(null);
  const [simulatorState, setSimulatorState] = useState({ isRunning: false, intervalMs: 2000 });
  const [rules, setRules] = useState([]);
  const [investigations, setInvestigations] = useState([]);
  const [customerAlerts, setCustomerAlerts] = useState([]);

  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  // Initial data fetch
  const fetchAllData = async () => {
    try {
      const [txRes, statsRes, rulesRes, invRes, alertsRes, simRes] = await Promise.all([
        apiFetch('/api/transactions?limit=50').then(r => r.json()),
        apiFetch('/api/stats').then(r => r.json()),
        apiFetch('/api/rules').then(r => r.json()),
        apiFetch('/api/investigations?limit=50').then(r => r.json()),
        apiFetch('/api/customer-alerts?limit=20').then(r => r.json()),
        apiFetch('/api/simulator/status').then(r => r.json())
      ]);

      if (txRes.success) setTransactions(txRes.data);
      if (statsRes.success) setStats(statsRes.data);
      if (rulesRes.success) setRules(rulesRes.data);
      if (invRes.success) setInvestigations(invRes.data);
      if (alertsRes.success) setCustomerAlerts(alertsRes.data);
      if (simRes.success) setSimulatorState(simRes.data);
    } catch (err) {
      console.error('Failed to fetch initial data:', err);
    }
  };

  const connectWebSocket = () => {
    // 1. Check explicit environment variable first
    let wsUrl = import.meta.env.VITE_WS_URL;
    
    // 2. Otherwise auto-resolve:
    if (!wsUrl) {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      // If frontend runs on dev server (any port other than 4000), connect to backend at port 4000
      const wsHost = (window.location.port && window.location.port !== '4000')
        ? `${window.location.hostname}:4000`
        : window.location.host;
      wsUrl = `${protocol}//${wsHost}`;
    }

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      ws.onmessage = (event) => {
        try {
          const { type, payload } = JSON.parse(event.data);

          if (type === 'NEW_TRANSACTION') {
            const newTx = payload.transaction;
            setTransactions(prev => [newTx, ...prev.slice(0, 75)]);
            // Refresh stats
            apiFetch('/api/stats').then(r => r.json()).then(res => {
              if (res.success) setStats(res.data);
            });
            // If flagged or blocked, refresh investigations and alerts
            if (newTx.status === 'BLOCKED' || newTx.status === 'FLAGGED') {
              apiFetch('/api/investigations?limit=50').then(r => r.json()).then(res => {
                if (res.success) setInvestigations(res.data);
              });
              apiFetch('/api/customer-alerts?limit=20').then(r => r.json()).then(res => {
                if (res.success) setCustomerAlerts(res.data);
              });
            }
          } else if (type === 'HIGH_RISK_ALERT') {
            setActiveAlert(payload);
          } else if (type === 'INVESTIGATION_UPDATED') {
            // Refresh investigations and transactions
            apiFetch('/api/investigations?limit=50').then(r => r.json()).then(res => {
              if (res.success) setInvestigations(res.data);
            });
            apiFetch('/api/transactions?limit=50').then(r => r.json()).then(res => {
              if (res.success) setTransactions(res.data);
            });
            apiFetch('/api/stats').then(r => r.json()).then(res => {
              if (res.success) setStats(res.data);
            });
          } else if (type === 'CUSTOMER_ALERT_UPDATED') {
            apiFetch('/api/customer-alerts?limit=20').then(r => r.json()).then(res => {
              if (res.success) setCustomerAlerts(res.data);
            });
            apiFetch('/api/investigations?limit=50').then(r => r.json()).then(res => {
              if (res.success) setInvestigations(res.data);
            });
            apiFetch('/api/transactions?limit=50').then(r => r.json()).then(res => {
              if (res.success) setTransactions(res.data);
            });
          } else if (type === 'SIMULATOR_STATE') {
            setSimulatorState(payload);
          } else if (type === 'RULE_UPDATED') {
            setRules(prev => prev.map(r => r.code === payload.code ? payload : r));
          }
        } catch (err) {
          console.error('WebSocket message parsing error:', err);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        // Attempt reconnect after 2 seconds
        reconnectTimeoutRef.current = setTimeout(connectWebSocket, 2000);
      };

      ws.onerror = () => {
        setIsConnected(false);
        ws.close();
      };
    } catch (err) {
      console.error('WebSocket connection error:', err);
      reconnectTimeoutRef.current = setTimeout(connectWebSocket, 2000);
    }
  };

  useEffect(() => {
    fetchAllData();
    connectWebSocket();

    return () => {
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, []);

  return (
    <SocketContext.Provider value={{
      isConnected,
      transactions,
      activeAlert,
      setActiveAlert,
      stats,
      simulatorState,
      setSimulatorState,
      rules,
      setRules,
      investigations,
      setInvestigations,
      customerAlerts,
      setCustomerAlerts,
      refreshData: fetchAllData
    }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) throw new Error('useSocket must be used within a SocketProvider');
  return context;
}
