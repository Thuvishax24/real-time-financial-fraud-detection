import { db } from '../db/database.js';
import { evaluateTransaction } from '../engine/evaluator.js';
import { socketManager } from '../ws/socketManager.js';

class TransactionSimulator {
  constructor() {
    this.timer = null;
    this.isRunning = false;
    this.intervalMs = 2000;

    this.sampleMerchants = [
      { name: 'Amazon Web Store', category: 'RETAIL', city: 'Seattle', country: 'US', lat: 47.6062, lng: -122.3321, channel: 'ONLINE' },
      { name: 'Target Supercenter', category: 'GROCERY', city: 'Minneapolis', country: 'US', lat: 44.9778, lng: -93.2650, channel: 'POS' },
      { name: 'Starbucks Reserve', category: 'RETAIL', city: 'New York', country: 'US', lat: 40.7128, lng: -74.0060, channel: 'POS' },
      { name: 'Apple Fifth Avenue', category: 'ELECTRONICS', city: 'New York', country: 'US', lat: 40.7638, lng: -73.9729, channel: 'POS' },
      { name: 'Uber Rides & Eats', category: 'TRAVEL', city: 'San Francisco', country: 'US', lat: 37.7749, lng: -122.4194, channel: 'MOBILE' },
      { name: 'Netflix Subscription', category: 'RETAIL', city: 'Los Gatos', country: 'US', lat: 37.2358, lng: -121.9624, channel: 'ONLINE' },
      { name: 'Tesco Express', category: 'GROCERY', city: 'London', country: 'GB', lat: 51.5074, lng: -0.1278, channel: 'POS' },
      { name: 'British Airways', category: 'TRAVEL', city: 'London', country: 'GB', lat: 51.4700, lng: -0.4543, channel: 'ONLINE' },
      { name: 'Shell Gas Station', category: 'RETAIL', city: 'Chicago', country: 'US', lat: 41.8781, lng: -87.6298, channel: 'POS' },
      { name: 'Trader Joe\'s', category: 'GROCERY', city: 'Austin', country: 'US', lat: 30.2672, lng: -97.7431, channel: 'POS' }
    ];
  }

  start(intervalMs = 2000) {
    if (this.isRunning) return;
    this.intervalMs = Math.max(500, intervalMs);
    this.isRunning = true;

    this.timer = setInterval(() => {
      this.generateSingleRandomTransaction();
    }, this.intervalMs);

    socketManager.broadcast('SIMULATOR_STATE', { isRunning: true, intervalMs: this.intervalMs });
  }

  stop() {
    if (!this.isRunning) return;
    clearInterval(this.timer);
    this.timer = null;
    this.isRunning = false;

    socketManager.broadcast('SIMULATOR_STATE', { isRunning: false, intervalMs: this.intervalMs });
  }

  setSpeed(intervalMs) {
    this.intervalMs = Math.max(500, intervalMs);
    if (this.isRunning) {
      clearInterval(this.timer);
      this.timer = setInterval(() => {
        this.generateSingleRandomTransaction();
      }, this.intervalMs);
    }
    socketManager.broadcast('SIMULATOR_STATE', { isRunning: this.isRunning, intervalMs: this.intervalMs });
  }

  generateSingleRandomTransaction() {
    try {
      const activeCustomers = db.prepare("SELECT * FROM customers WHERE status = 'ACTIVE'").all();
      if (!activeCustomers || activeCustomers.length === 0) return;

      const customer = activeCustomers[Math.floor(Math.random() * activeCustomers.length)];
      const account = db.prepare("SELECT * FROM accounts WHERE customer_id = ? AND status = 'ACTIVE' LIMIT 1").get(customer.id);
      if (!account) return;

      // 88% chance normal routine transaction, 12% sporadic anomaly
      const isAnomaly = Math.random() < 0.12;

      let txInput;
      if (!isAnomaly) {
        // Normal transaction
        const merchant = this.sampleMerchants[Math.floor(Math.random() * this.sampleMerchants.length)];
        const amount = Math.max(8.50, parseFloat((customer.avg_transaction_amount * (0.4 + Math.random() * 0.9)).toFixed(2)));

        txInput = {
          account_id: account.id,
          customer_id: customer.id,
          amount,
          currency: account.currency || 'USD',
          merchant_name: merchant.name,
          merchant_category: merchant.category,
          channel: merchant.channel,
          location_city: customer.primary_city,
          location_country: customer.primary_country,
          latitude: customer.primary_lat + (Math.random() - 0.5) * 0.05,
          longitude: customer.primary_lng + (Math.random() - 0.5) * 0.05,
          ip_address: `198.51.100.${Math.floor(Math.random() * 200 + 10)}`,
          device_id: `DEV-${customer.id.replace('CUST-', '')}`,
          device_os: 'iOS 17.4',
          is_trusted_device: 1,
          timestamp: new Date().toISOString()
        };
      } else {
        // Sporadic anomaly: unusual amount or crypto category
        const anomalyType = Math.random();
        if (anomalyType < 0.5) {
          // Amount spike
          const amount = parseFloat((customer.avg_transaction_amount * (4.5 + Math.random() * 3)).toFixed(2));
          txInput = {
            account_id: account.id,
            customer_id: customer.id,
            amount,
            currency: account.currency || 'USD',
            merchant_name: 'Luxury Watches & Jewelry',
            merchant_category: 'RETAIL',
            channel: 'ONLINE',
            location_city: customer.primary_city,
            location_country: customer.primary_country,
            latitude: customer.primary_lat,
            longitude: customer.primary_lng,
            ip_address: `203.0.113.${Math.floor(Math.random() * 250)}`,
            device_id: `DEV-NEW-${Math.floor(Math.random() * 9000)}`,
            device_os: 'Windows 11',
            is_trusted_device: 0,
            timestamp: new Date().toISOString()
          };
        } else {
          // High-risk merchant category
          txInput = {
            account_id: account.id,
            customer_id: customer.id,
            amount: 650.00,
            currency: account.currency || 'USD',
            merchant_name: 'BitFlow Crypto Swap',
            merchant_category: 'CRYPTO',
            channel: 'ONLINE',
            location_city: customer.primary_city,
            location_country: customer.primary_country,
            latitude: customer.primary_lat,
            longitude: customer.primary_lng,
            ip_address: `185.220.101.${Math.floor(Math.random() * 250)}`,
            device_id: `DEV-UNKNOWN-${Math.floor(Math.random() * 9000)}`,
            device_os: 'Linux x86_64',
            is_trusted_device: 0,
            timestamp: new Date().toISOString()
          };
        }
      }

      const result = evaluateTransaction(txInput);

      // Broadcast to all WebSocket clients
      socketManager.broadcast('NEW_TRANSACTION', result);
      if (result.transaction.status === 'BLOCKED' || result.transaction.status === 'FLAGGED') {
        socketManager.broadcast('HIGH_RISK_ALERT', result);
      }
    } catch (err) {
      console.error('Simulator error:', err);
    }
  }

  // Pre-configured Fraud Attack Scenarios
  injectScenario(scenarioType) {
    const results = [];

    switch (scenarioType) {
      case 'IMPOSSIBLE_TRAVEL': {
        // Customer 1005 (Elena Rostova in London)
        const account = db.prepare('SELECT * FROM accounts WHERE customer_id = ?').get('CUST-1005');
        if (!account) break;

        // Step 1: Routine transaction in London 12 minutes ago
        const tx1 = evaluateTransaction({
          account_id: account.id,
          customer_id: 'CUST-1005',
          amount: 45.00,
          currency: 'GBP',
          merchant_name: 'Pret A Manger Piccadilly',
          merchant_category: 'RETAIL',
          channel: 'POS',
          location_city: 'London',
          location_country: 'GB',
          latitude: 51.5074,
          longitude: -0.1278,
          timestamp: new Date(Date.now() - 12 * 60 * 1000).toISOString()
        });
        results.push(tx1);

        // Step 2: Sudden $3,800 charge in Singapore (10,800 km away, impossible 12 min travel)
        const tx2 = evaluateTransaction({
          account_id: account.id,
          customer_id: 'CUST-1005',
          amount: 3800.00,
          currency: 'USD',
          merchant_name: 'Marina Bay Sands High Roller Boutique',
          merchant_category: 'ELECTRONICS',
          channel: 'POS',
          location_city: 'Singapore',
          location_country: 'SG',
          latitude: 1.2838,
          longitude: 103.8591,
          ip_address: '103.252.200.14',
          device_id: 'DEV-CLONED-POS-SG',
          device_os: 'Embedded POS',
          is_trusted_device: 0,
          timestamp: new Date().toISOString()
        });
        results.push(tx2);
        break;
      }

      case 'ACCOUNT_TAKEOVER_WIRE': {
        // Customer 1004 (David Miller - senior citizen, dormant account)
        const account = db.prepare('SELECT * FROM accounts WHERE customer_id = ?').get('CUST-1004');
        if (!account) break;

        const tx = evaluateTransaction({
          account_id: account.id,
          customer_id: 'CUST-1004',
          amount: 8750.00,
          currency: 'USD',
          merchant_name: 'Panama Offshore Wire Services',
          merchant_category: 'CRYPTO',
          channel: 'WIRE',
          location_city: 'Panama City',
          location_country: 'PA',
          latitude: 8.9824,
          longitude: -79.5199,
          ip_address: '185.156.73.54',
          device_id: 'DEV-TOR-EXIT-NODE',
          device_os: 'Linux (Unknown)',
          is_trusted_device: 0,
          timestamp: new Date().toISOString()
        });
        results.push(tx);
        break;
      }

      case 'CARD_TESTING_BURST': {
        // Frank Thorne (CUST-1006) - testing bot fires 5 rapid micro-charges in 10 seconds
        const account = db.prepare('SELECT * FROM accounts WHERE customer_id = ?').get('CUST-1006');
        if (!account) break;

        const amounts = [1.15, 1.49, 2.05, 1.89, 3.20];
        const merchants = ['Digital Ocean Sandbox', 'Stripe Test Charge', 'AWS Free Tier Verify', 'Twilio Test SMS', 'GitHub Verify'];

        for (let i = 0; i < amounts.length; i++) {
          const tx = evaluateTransaction({
            account_id: account.id,
            customer_id: 'CUST-1006',
            amount: amounts[i],
            currency: 'USD',
            merchant_name: merchants[i],
            merchant_category: 'RETAIL',
            channel: 'ONLINE',
            location_city: 'Austin',
            location_country: 'US',
            latitude: 30.2672,
            longitude: -97.7431,
            ip_address: '45.33.32.156',
            device_id: 'DEV-BOT-PUPPETEER',
            device_os: 'Headless Chrome',
            is_trusted_device: 0,
            timestamp: new Date(Date.now() - (amounts.length - i) * 2000).toISOString()
          });
          results.push(tx);
        }
        break;
      }

      case 'MIDNIGHT_HIGH_VALUE_GAMBLING': {
        // Alice Walker (CUST-1001) - normal grocery shopper doing $5,400 midnight gambling
        const account = db.prepare('SELECT * FROM accounts WHERE customer_id = ?').get('CUST-1001');
        if (!account) break;

        // Force a midnight timestamp (03:15 AM UTC)
        const midnightTime = new Date();
        midnightTime.setUTCHours(3, 15, 0, 0);

        const tx = evaluateTransaction({
          account_id: account.id,
          customer_id: 'CUST-1001',
          amount: 5400.00,
          currency: 'USD',
          merchant_name: 'Curacao Jackpot Casino Online',
          merchant_category: 'GAMBLING',
          channel: 'ONLINE',
          location_city: 'Willemstad',
          location_country: 'CW',
          latitude: 12.1224,
          longitude: -68.9335,
          ip_address: '194.26.29.112',
          device_id: 'DEV-UNKNOWN-ANDROID',
          device_os: 'Android 11 (Proxy)',
          is_trusted_device: 0,
          timestamp: midnightTime.toISOString()
        });
        results.push(tx);
        break;
      }
    }

    // Broadcast results
    for (const r of results) {
      socketManager.broadcast('NEW_TRANSACTION', r);
      if (r.transaction.status === 'BLOCKED' || r.transaction.status === 'FLAGGED') {
        socketManager.broadcast('HIGH_RISK_ALERT', r);
      }
    }

    return results;
  }
}

export const simulator = new TransactionSimulator();
export default simulator;
