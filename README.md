# FraudGuard AI — Real-Time Financial Fraud Detection & Transaction Monitoring System

[![Node.js](https://img.shields.io/badge/Node.js-v24+-green.svg)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v3.4-38B2AC.svg)](https://tailwindcss.com)
[![License](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)

An end-to-end, enterprise-grade **Real-Time Financial Fraud Detection and Transaction Monitoring System** built from scratch. Designed to evaluate thousands of streaming transactions per second with sub-15ms latency, calculate multi-factor risk scores (0–100), automatically freeze high-risk attacks, and provide **100% explainable plain-English mathematical rationale** for fraud analysts.

---

## 🌟 Core Architecture & Capabilities

### 1. Explainable Risk Scoring Engine (0 - 100)
Every incoming transaction is evaluated against 8 modular heuristic and behavioural security rules:
- **Velocity Spike Detection**: Flags accounts executing rapid bursts (> 3 transactions within 120s).
- **Amount Anomaly**: Detects amounts exceeding $5,000 or > 3.5x customer historical spending average.
- **Impossible Travel / Teleportation**: Computes Haversine great-circle distance and physical travel speed between consecutive transactions. If speed > 900 km/h, automatically blocks the transaction.
- **High-Risk Merchant Sectors**: Detects transactions involving offshore crypto exchanges, darknet services, or unregulated gambling.
- **Dormant Account Reactivation**: Alerts when accounts inactive for >30 days suddenly initiate high-value transfers.
- **Off-Hours / Midnight Anomaly**: Detects large transfers occurring between 1:00 AM and 4:30 AM local time.
- **Device & IP Reputation**: Identifies untrusted client hardware and foreign proxy/VPN indicators.
- **Card Testing Micro-Charges**: Flags rapid sequential small charges ($0.50 - $4.00) indicative of stolen card testing bots.

**Risk Classification Tiers:**
- `0 - 39`: **LOW RISK** → `APPROVED` (Green)
- `40 - 69`: **MEDIUM RISK** → `FLAGGED FOR REVIEW` (Yellow/Orange)
- `70 - 100`: **HIGH RISK** → `TEMPORARILY BLOCKED` (Crimson - Funds automatically withheld)

### 2. Explainability & Audit Transparency
- Full breakdown of each triggered rule's point contribution and percentage of total risk score.
- Plain-English executive summary narrative for auditors and compliance officers.
- Customer spending baseline comparisons (historical average vs current attempt).
- Geolocation distance calculation (e.g. *Tokyo transaction 12 minutes after London, speed >45,000 km/h*).

### 3. Real-Time WebSocket Streaming & Attack Injector
- Bi-directional WebSocket stream broadcasting new transactions and critical alerts in real-time.
- One-click realistic fraud attack scenarios:
  - ⚡ **Impossible Travel Anomaly**: London card swipe followed by Singapore luxury electronics charge 12 minutes later.
  - ⚡ **Account Takeover Wire**: Dormant elderly account wiring $8,750 to a Panama crypto broker.
  - ⚡ **Card Testing Blitz**: Automated bot firing 5 rapid micro-charges in 10 seconds.
  - ⚡ **Midnight High-Roller Gambling**: 3:15 AM $5,400 charge to Curacao Casino.

### 4. Fraud Analyst Investigation Hub
- Priority queue sorted by severity (`CRITICAL`, `HIGH`, `MEDIUM`).
- Case investigation modal with complete customer profile, historical baseline, and device details.
- Action Buttons:
  - **Release & Approve Funds** (Unblocks transaction, logs reason, deducts verified funds).
  - **Confirm Fraud & Freeze Account** (Locks customer account and cards, prevents all further exfiltration).
  - **Unfreeze Customer** (Restores frozen customer profiles after security clearance).
  - **Analyst Notes & Timestamped Case History**.

### 5. Simulated Customer Mobile Security Challenge
- Simulates out-of-band security SMS challenges sent to cardholders upon anomaly detection.
- Interactive smartphone UI with live **"YES, It Was Me"** and **"NO - Freeze Card!"** buttons.
- Real-time resolution update sent back to fraud analysts.

### 6. Full Governance & Immutable Audit Trail
- Every evaluation, manual override, customer response, and rule calibration is permanently recorded in SQLite.
- Searchable by actor, action type, and transaction reference.

---

## 🚀 Quick Start Instructions

### Prerequisites
- **Node.js**: v20 or higher (v24 recommended — uses zero-dependency native `node:sqlite`)
- **npm**: v10 or higher

### 1. Run the Unified Production Server
```bash
# In the project root (fraud-guard-system/):
npm run start
```
Open **[http://localhost:4000](http://localhost:4000)** in your browser!

### 2. Development Mode (with Live Hot-Reloading)
Run the backend and frontend in separate terminals:

**Terminal 1 (Backend Server & WebSockets):**
```bash
cd server
npm start
# Runs Express + WebSocket on http://localhost:4000
```

**Terminal 2 (Frontend React + Vite):**
```bash
cd client
npm run dev
# Runs Vite HMR on http://localhost:3000 (proxies /api and /ws to 4000)
```

---

## 🧪 Automated Unit Testing
Run the comprehensive test suite verifying the Rule Engine, Haversine impossible travel detection, and explainability generator:
```bash
cd server
npm test
```

---

## 📡 REST API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/api/health` | GET | Health status and active WebSocket clients count |
| `/api/transactions` | GET | List streaming transactions with filters (`status`, `risk_level`, `limit`) |
| `/api/transactions/:id` | GET | Transaction details with full explainability and rule breakdown |
| `/api/transactions/evaluate` | POST | Evaluate any custom transaction in real time |
| `/api/investigations` | GET | Queue of pending, under-review, or resolved cases |
| `/api/investigations/:id/action` | POST | Analyst action (`RELEASE_AND_APPROVE`, `CONFIRM_FRAUD_AND_FREEZE`, `ASSIGN_ANALYST`, `ADD_NOTE`) |
| `/api/rules` | GET | Fetch all 8 configurable fraud rules and current weights |
| `/api/rules/:code` | PUT | Calibrate rule weight, threshold, or toggle enabled status live |
| `/api/stats` | GET | Key KPIs: Volume, Fraud Rate %, Losses Prevented $, Rule Frequency |
| `/api/simulator/start` | POST | Start background transaction generator |
| `/api/simulator/stop` | POST | Pause transaction generator |
| `/api/simulator/inject-attack` | POST | Inject specific attack scenario (`IMPOSSIBLE_TRAVEL`, `ACCOUNT_TAKEOVER_WIRE`, etc.) |
| `/api/customer-alerts/:id/respond` | POST | Simulate customer response (`CONFIRM_LEGITIMATE` / `REPORT_FRAUD`) |
| `/api/customers/:id/unfreeze` | POST | Restore frozen customer profile and accounts |
| `/api/audit-logs` | GET | Complete immutable audit log history |

---

## 🛡️ License
MIT License. Built for modern financial institutions, payment gateways, and risk operations centers.
