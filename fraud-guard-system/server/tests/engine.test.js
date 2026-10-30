import test from 'node:test';
import assert from 'node:assert/strict';
import { initializeDatabase, db } from '../src/db/database.js';
import { seedInitialData } from '../src/db/seedData.js';
import { evaluateTransaction } from '../src/engine/evaluator.js';

test.before(() => {
  initializeDatabase();
  seedInitialData();
});

test('Rule Engine: Normal routine transaction is APPROVED with LOW risk score', () => {
  const result = evaluateTransaction({
    account_id: 'ACC-2006',
    customer_id: 'CUST-1006',
    amount: 15.00,
    merchant_name: 'Campus Bookstore',
    merchant_category: 'RETAIL',
    channel: 'POS',
    location_city: 'Austin',
    location_country: 'US',
    latitude: 30.2672,
    longitude: -97.7431,
    is_trusted_device: 1,
    timestamp: new Date().toISOString()
  });

  assert.equal(result.transaction.status, 'APPROVED');
  assert.equal(result.transaction.risk_level, 'LOW');
  assert.ok(result.explainability.score < 40, `Expected score < 40, got ${result.explainability.score}`);
  assert.ok(result.explainability.summary.length > 0);
});

test('Rule Engine: Impossible Travel Anomaly triggers GEO_IMPOSSIBLE and BLOCKS transaction', () => {
  // Use a dedicated test account
  const testAccId = `ACC-GEO-${Date.now()}`;
  const testCustId = `CUST-GEO-${Date.now()}`;
  
  db.prepare(`
    INSERT INTO customers (id, name, email, phone, avg_transaction_amount, primary_city, primary_country, primary_lat, primary_lng, created_at)
    VALUES (?, 'Travel Test User', 'travel@test.com', '+1-555-0199', 100.0, 'Chicago', 'US', 41.8781, -87.6298, ?)
  `).run(testCustId, new Date().toISOString());

  db.prepare(`
    INSERT INTO accounts (id, customer_id, account_number, balance, created_at)
    VALUES (?, ?, ?, 10000.0, ?)
  `).run(testAccId, testCustId, `ACC-NUM-${Date.now()}`, new Date().toISOString());

  // First transaction in Chicago (10 mins ago)
  const t1Time = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  evaluateTransaction({
    account_id: testAccId,
    customer_id: testCustId,
    amount: 85.00,
    merchant_name: 'Chicago Cafe',
    merchant_category: 'RETAIL',
    channel: 'POS',
    location_city: 'Chicago',
    location_country: 'US',
    latitude: 41.8781,
    longitude: -87.6298,
    timestamp: t1Time
  });

  // Second transaction 10 minutes later in Tokyo, Japan (~10,140 km away)
  const t2Time = new Date().toISOString();
  const result = evaluateTransaction({
    account_id: testAccId,
    customer_id: testCustId,
    amount: 1200.00,
    merchant_name: 'Shinjuku Luxury Electronics',
    merchant_category: 'ELECTRONICS',
    channel: 'POS',
    location_city: 'Tokyo',
    location_country: 'JP',
    latitude: 35.6762,
    longitude: 139.6503,
    timestamp: t2Time
  });

  assert.equal(result.transaction.status, 'BLOCKED');
  assert.equal(result.transaction.risk_level, 'HIGH');
  assert.ok(result.explainability.score >= 70, `Expected high risk score >= 70, got ${result.explainability.score}`);

  const hasGeoRule = result.explainability.factorBreakdown.some(f => f.code === 'GEO_IMPOSSIBLE');
  assert.ok(hasGeoRule, 'Expected GEO_IMPOSSIBLE rule to be triggered');
  assert.ok(result.investigation !== null, 'Expected auto-created investigation for blocked transaction');
  assert.ok(result.customerNotification !== null, 'Expected customer alert notification dispatched');
});

test('Rule Engine: Dormant account high-value wire triggers DORMANT_BURST', () => {
  const testAccId = `ACC-DORM-${Date.now()}`;
  const testCustId = `CUST-DORM-${Date.now()}`;
  const fortyFiveDaysAgo = new Date(Date.now() - 45 * 86400000).toISOString();

  db.prepare(`
    INSERT INTO customers (id, name, email, phone, avg_transaction_amount, primary_city, primary_country, primary_lat, primary_lng, created_at)
    VALUES (?, 'Dormant User', 'dormant@test.com', '+1-555-0999', 60.0, 'Miami', 'US', 25.7617, -80.1918, ?)
  `).run(testCustId, new Date().toISOString());

  db.prepare(`
    INSERT INTO accounts (id, customer_id, account_number, balance, is_dormant, last_active_at, created_at)
    VALUES (?, ?, ?, 15000.0, 1, ?, ?)
  `).run(testAccId, testCustId, `ACC-DORM-NUM-${Date.now()}`, fortyFiveDaysAgo, fortyFiveDaysAgo);

  const result = evaluateTransaction({
    account_id: testAccId,
    customer_id: testCustId,
    amount: 4500.00,
    merchant_name: 'BitTransfer Offshore Wire',
    merchant_category: 'CRYPTO',
    channel: 'WIRE',
    location_city: 'Miami',
    location_country: 'US',
    latitude: 25.7617,
    longitude: -80.1918,
    is_trusted_device: 0,
    timestamp: new Date().toISOString()
  });

  assert.equal(result.transaction.status, 'BLOCKED');
  const hasDormant = result.explainability.factorBreakdown.some(f => f.code === 'DORMANT_BURST');
  assert.ok(hasDormant, 'Expected DORMANT_BURST rule to trigger');
});

test('Rule Engine: Velocity Spike triggers when multiple transactions occur rapidly', () => {
  const testAccId = `ACC-VEL-${Date.now()}`;
  const testCustId = `CUST-VEL-${Date.now()}`;
  
  db.prepare(`
    INSERT INTO customers (id, name, email, phone, avg_transaction_amount, primary_city, primary_country, primary_lat, primary_lng, created_at)
    VALUES (?, 'Velocity Test User', 'vel@test.com', '+1-555-0188', 100.0, 'New York', 'US', 40.7128, -74.0060, ?)
  `).run(testCustId, new Date().toISOString());

  db.prepare(`
    INSERT INTO accounts (id, customer_id, account_number, balance, created_at)
    VALUES (?, ?, ?, 5000.0, ?)
  `).run(testAccId, testCustId, `ACC-NUM-VEL-${Date.now()}`, new Date().toISOString());

  // Fire 4 rapid transactions within 30 seconds
  for (let i = 0; i < 3; i++) {
    evaluateTransaction({
      account_id: testAccId,
      customer_id: testCustId,
      amount: 40.00,
      merchant_name: `Quick Store ${i}`,
      merchant_category: 'RETAIL',
      channel: 'POS',
      location_city: 'New York',
      location_country: 'US',
      latitude: 40.7128,
      longitude: -74.0060,
      timestamp: new Date().toISOString()
    });
  }

  // 4th transaction triggers velocity spike threshold (> 3)
  const result = evaluateTransaction({
    account_id: testAccId,
    customer_id: testCustId,
    amount: 45.00,
    merchant_name: 'Quick Store 4',
    merchant_category: 'RETAIL',
    channel: 'POS',
    location_city: 'New York',
    location_country: 'US',
    latitude: 40.7128,
    longitude: -74.0060,
    timestamp: new Date().toISOString()
  });

  const hasVelocity = result.explainability.factorBreakdown.some(f => f.code === 'VELOCITY_SPIKE');
  assert.ok(hasVelocity, 'Expected VELOCITY_SPIKE rule to trigger');
});

