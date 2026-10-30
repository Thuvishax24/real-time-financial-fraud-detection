import test from 'node:test';
import assert from 'node:assert/strict';
import { WebSocket } from 'ws';

const BASE_URL = 'http://localhost:4000';
const WS_URL = 'ws://localhost:4000';

test('1. Frontend Asset Delivery & SPA Fallback', async () => {
  // Check index.html is served
  const res = await fetch(`${BASE_URL}/`);
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.ok(html.includes('<div id="root"></div>') || html.includes('<!doctype html>'), 'Expected valid HTML response');

  // Check SPA route fallback (e.g. /analyst should return index.html)
  const spaRes = await fetch(`${BASE_URL}/analyst`);
  assert.equal(spaRes.status, 200);
  const spaHtml = await spaRes.text();
  assert.ok(spaHtml.includes('<!doctype html>'), 'SPA fallback should serve index.html');
});

test('2. CORS Headers on Preflight and API Endpoints', async () => {
  // Preflight check
  const preflightRes = await fetch(`${BASE_URL}/api/transactions`, {
    method: 'OPTIONS',
    headers: {
      'Origin': 'http://localhost:3000',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'Content-Type'
    }
  });
  assert.equal(preflightRes.status, 204);
  assert.ok(preflightRes.headers.get('access-control-allow-origin'), 'Expected CORS allow-origin header');

  // Regular GET with Origin
  const getRes = await fetch(`${BASE_URL}/api/health`, {
    headers: { 'Origin': 'http://localhost:5173' }
  });
  assert.equal(getRes.status, 200);
  assert.ok(getRes.headers.get('access-control-allow-origin'), 'Expected CORS allow-origin on GET');
});

test('3. API Endpoints: Health, Stats, Rules, Customers, Audit', async () => {
  // Health
  const healthRes = await fetch(`${BASE_URL}/api/health`).then(r => r.json());
  assert.equal(healthRes.status, 'ok');

  // Stats
  const statsRes = await fetch(`${BASE_URL}/api/stats`).then(r => r.json());
  assert.equal(statsRes.success, true);
  assert.ok(statsRes.data.totalTransactions >= 0);
  assert.ok(statsRes.data.riskDistribution !== undefined);

  // Rules
  const rulesRes = await fetch(`${BASE_URL}/api/rules`).then(r => r.json());
  assert.equal(rulesRes.success, true);
  assert.ok(rulesRes.data.length >= 8);

  // Update rule weight
  const ruleUpdate = await fetch(`${BASE_URL}/api/rules/VELOCITY_SPIKE`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ weight: 35, enabled: true, threshold: 3 })
  }).then(r => r.json());
  assert.equal(ruleUpdate.success, true);
  assert.equal(ruleUpdate.data.weight, 35);

  // Customers
  const custRes = await fetch(`${BASE_URL}/api/customers`).then(r => r.json());
  assert.equal(custRes.success, true);
  assert.ok(custRes.data.length > 0);

  // Audit Logs
  const auditRes = await fetch(`${BASE_URL}/api/audit-logs?limit=5`).then(r => r.json());
  assert.equal(auditRes.success, true);
  assert.ok(Array.isArray(auditRes.data));
});

test('4. End-to-End Transaction Evaluation Flow', async () => {
  // Evaluate new transaction
  const evalRes = await fetch(`${BASE_URL}/api/transactions/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customer_id: 'CUST-1003',
      amount: 15000.00, // Large amount trigger
      merchant_name: 'Geneva Luxury Timepieces',
      merchant_category: 'RETAIL',
      channel: 'ONLINE',
      location_city: 'San Francisco',
      location_country: 'US',
      is_trusted_device: 1
    })
  }).then(r => r.json());

  assert.equal(evalRes.success, true);
  assert.ok(evalRes.data.transaction.id);
  assert.ok(evalRes.data.explainability.score > 0);
  assert.ok(evalRes.data.explainability.summary);
  assert.ok(evalRes.data.explainability.factorBreakdown.length > 0);

  const txId = evalRes.data.transaction.id;

  // Retrieve transaction by ID
  const getTx = await fetch(`${BASE_URL}/api/transactions/${txId}`).then(r => r.json());
  assert.equal(getTx.success, true);
  assert.equal(getTx.data.id, txId);
  assert.ok(getTx.data.customer_name);
});

test('5. Analyst Investigation & Case Resolution Workflow', async () => {
  // Create an explicit high-risk attack transaction to guarantee investigation case
  const attackRes = await fetch(`${BASE_URL}/api/simulator/inject-attack`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenario: 'ACCOUNT_TAKEOVER_WIRE' })
  }).then(r => r.json());

  assert.equal(attackRes.success, true);
  assert.ok(attackRes.data.length > 0);

  const blockedTx = attackRes.data[0].transaction;

  // Fetch pending investigations
  const invRes = await fetch(`${BASE_URL}/api/investigations?status=PENDING`).then(r => r.json());
  assert.equal(invRes.success, true);
  assert.ok(invRes.data.length > 0);

  const targetInv = invRes.data.find(i => i.transaction_id === blockedTx.id) || invRes.data[0];
  assert.ok(targetInv, 'Expected an investigation for the blocked transaction');

  // Analyst adds note
  const noteRes = await fetch(`${BASE_URL}/api/investigations/${targetInv.id}/action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'ADD_NOTE',
      analystName: 'Senior Risk Lead',
      notes: 'Investigating potential account takeover via offshore wire.'
    })
  }).then(r => r.json());
  assert.equal(noteRes.success, true);

  // Analyst assigns case
  const assignRes = await fetch(`${BASE_URL}/api/investigations/${targetInv.id}/action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'ASSIGN_ANALYST',
      analystName: 'Senior Risk Lead'
    })
  }).then(r => r.json());
  assert.equal(assignRes.success, true);
  assert.equal(assignRes.data.status, 'UNDER_REVIEW');

  // Analyst confirms fraud & freezes account
  const freezeRes = await fetch(`${BASE_URL}/api/investigations/${targetInv.id}/action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'CONFIRM_FRAUD_AND_FREEZE',
      analystName: 'Senior Risk Lead',
      notes: 'Unauthorized credentials exfiltration confirmed. Freezing profile.',
      reason: 'Malicious Wire Attempt'
    })
  }).then(r => r.json());
  assert.equal(freezeRes.success, true);
  assert.equal(freezeRes.data.status, 'CONFIRMED_FRAUD');

  // Verify customer was frozen
  const custRes = await fetch(`${BASE_URL}/api/customers`).then(r => r.json());
  const frozenCust = custRes.data.find(c => c.id === targetInv.customer_id);
  assert.equal(frozenCust.status, 'FROZEN');

  // Unfreeze customer
  const unfreezeRes = await fetch(`${BASE_URL}/api/customers/${targetInv.customer_id}/unfreeze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ analystName: 'Security Admin' })
  }).then(r => r.json());
  assert.equal(unfreezeRes.success, true);
});

test('6. Customer Out-of-Band Security SMS Challenge & Response Flow', async () => {
  // Fetch customer alerts
  const alertsRes = await fetch(`${BASE_URL}/api/customer-alerts?limit=10`).then(r => r.json());
  assert.equal(alertsRes.success, true);
  assert.ok(alertsRes.data.length > 0);

  const alert = alertsRes.data[0];

  // Customer responds YES (Legitimate)
  const confirmRes = await fetch(`${BASE_URL}/api/customer-alerts/${alert.id}/respond`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ response: 'CONFIRM_LEGITIMATE' })
  }).then(r => r.json());

  assert.equal(confirmRes.success, true);
  assert.equal(confirmRes.data.status, 'VERIFIED_LEGITIMATE');
});

test('7. Real-Time WebSocket Streaming & Event Delivery', async () => {
  const ws = new WebSocket(WS_URL);

  const receivedEvents = [];

  await new Promise((resolve, reject) => {
    ws.on('open', () => {
      resolve();
    });
    ws.on('error', (err) => {
      reject(err);
    });
    ws.on('message', (msg) => {
      try {
        const parsed = JSON.parse(msg.toString());
        receivedEvents.push(parsed);
      } catch (e) {}
    });
  });

  // Check initial CONNECTED event
  await new Promise(r => setTimeout(r, 200));
  const hasConnected = receivedEvents.some(e => e.type === 'CONNECTED');
  assert.ok(hasConnected, 'WebSocket must receive CONNECTED welcome message');

  // Test PING / PONG
  ws.send(JSON.stringify({ type: 'PING' }));
  await new Promise(r => setTimeout(r, 200));
  const hasPong = receivedEvents.some(e => e.type === 'PONG');
  assert.ok(hasPong, 'WebSocket must respond with PONG');

  // Trigger action over HTTP and observe WS broadcast
  await fetch(`${BASE_URL}/api/simulator/inject-attack`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenario: 'IMPOSSIBLE_TRAVEL' })
  });

  await new Promise(r => setTimeout(r, 500));

  const hasNewTx = receivedEvents.some(e => e.type === 'NEW_TRANSACTION');
  const hasAlert = receivedEvents.some(e => e.type === 'HIGH_RISK_ALERT');

  assert.ok(hasNewTx, 'WebSocket must receive NEW_TRANSACTION broadcast');
  assert.ok(hasAlert, 'WebSocket must receive HIGH_RISK_ALERT broadcast');

  ws.close();
});
