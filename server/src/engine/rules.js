import { db } from '../db/database.js';
import { calculateHaversineDistanceKm } from './haversine.js';

// Fetch active rule definition from DB
function getRule(code) {
  return db.prepare('SELECT * FROM rules WHERE code = ? AND enabled = 1').get(code);
}

/**
 * 1. VELOCITY SPIKE: Checks if more than `threshold` transactions occurred in the last N seconds
 */
export function checkVelocitySpike(tx, accountId) {
  const rule = getRule('VELOCITY_SPIKE');
  if (!rule) return null;

  const windowSec = rule.time_window_seconds || 120;
  const threshold = rule.threshold || 3;
  const cutoffTime = new Date(new Date(tx.timestamp).getTime() - windowSec * 1000).toISOString();

  const countRow = db.prepare(`
    SELECT COUNT(*) as count FROM transactions
    WHERE account_id = ? AND timestamp >= ? AND timestamp <= ?
  `).get(accountId, cutoffTime, tx.timestamp);

  const count = (countRow ? countRow.count : 0) + 1; // including current

  if (count > threshold) {
    return {
      ruleCode: rule.code,
      ruleName: rule.name,
      weight: rule.weight,
      pointsAdded: rule.weight,
      explanation: `Account velocity spike: ${count} transactions initiated within ${windowSec} seconds (Threshold: max ${threshold}). High-frequency automated script suspected.`,
      details: { count, threshold, windowSeconds: windowSec }
    };
  }
  return null;
}

/**
 * 2. AMOUNT ANOMALY: Checks if amount exceeds multiplier * avg or exceeds absolute threshold
 */
export function checkAmountAnomaly(tx, customer) {
  const rule = getRule('AMOUNT_ANOMALY');
  if (!rule) return null;

  const customerAvg = customer.avg_transaction_amount || 100;
  const multiplierThreshold = rule.threshold || 3.5;
  const ratio = (tx.amount / customerAvg).toFixed(1);

  if (tx.amount >= customerAvg * multiplierThreshold || tx.amount >= 5000) {
    // Dynamic points scaling if extreme
    const points = tx.amount >= 10000 ? Math.min(rule.weight + 15, 50) : rule.weight;
    return {
      ruleCode: rule.code,
      ruleName: rule.name,
      weight: rule.weight,
      pointsAdded: points,
      explanation: `Amount deviation anomaly: $${tx.amount.toFixed(2)} is ${ratio}x higher than customer's established average ($${customerAvg.toFixed(2)}).`,
      details: { amount: tx.amount, customerAvg, ratio: parseFloat(ratio), multiplierThreshold }
    };
  }
  return null;
}

/**
 * 3. IMPOSSIBLE TRAVEL / TELEPORTATION:
 * Computes distance and required travel speed from previous transaction
 */
export function checkGeoImpossible(tx, accountId, customer) {
  const rule = getRule('GEO_IMPOSSIBLE');
  if (!rule) return null;

  // Find most recent previous transaction for this account
  const lastTx = db.prepare(`
    SELECT * FROM transactions
    WHERE account_id = ? AND timestamp < ?
    ORDER BY timestamp DESC LIMIT 1
  `).get(accountId, tx.timestamp);

  if (!lastTx || !lastTx.latitude || !tx.latitude) {
    // Fall back to comparing with customer home city if very distant
    if (customer.primary_lat && tx.latitude) {
      const distFromHome = calculateHaversineDistanceKm(
        customer.primary_lat, customer.primary_lng,
        tx.latitude, tx.longitude
      );
      if (distFromHome > 4000 && tx.amount > 500) {
        return {
          ruleCode: rule.code,
          ruleName: rule.name,
          weight: Math.round(rule.weight * 0.7),
          pointsAdded: Math.round(rule.weight * 0.7),
          explanation: `First foreign transaction detected in ${tx.location_city}, ${tx.location_country} (${distFromHome} km from customer home location in ${customer.primary_city}).`,
          details: { distanceKm: distFromHome, comparison: 'home_location' }
        };
      }
    }
    return null;
  }

  const timeDiffHours = (new Date(tx.timestamp).getTime() - new Date(lastTx.timestamp).getTime()) / (1000 * 3600);
  if (timeDiffHours <= 0) return null;

  const distanceKm = calculateHaversineDistanceKm(
    lastTx.latitude, lastTx.longitude,
    tx.latitude, tx.longitude
  );

  const speedKmh = Math.round(distanceKm / timeDiffHours);
  const maxFeasibleSpeed = rule.threshold || 900; // Commercial flight max ~900 km/h

  if (distanceKm > 200 && speedKmh > maxFeasibleSpeed) {
    // If supersonic or cross-continental teleportation (> 1000km and > 1200 km/h), score 75 to immediately block
    const points = (distanceKm > 1000 && speedKmh > 1200) ? 75 : rule.weight;
    return {
      ruleCode: rule.code,
      ruleName: rule.name,
      weight: rule.weight,
      pointsAdded: points,
      explanation: `Impossible travel anomaly: Transaction in ${tx.location_city}, ${tx.location_country} occurred ${(timeDiffHours * 60).toFixed(0)} minutes after transaction in ${lastTx.location_city}, ${lastTx.location_country} (${distanceKm.toLocaleString()} km apart). Required transit speed: ${speedKmh.toLocaleString()} km/h (Physically impossible, max threshold: ${maxFeasibleSpeed} km/h).`,
      details: {
        previousCity: lastTx.location_city,
        previousCountry: lastTx.location_country,
        currentCity: tx.location_city,
        currentCountry: tx.location_country,
        distanceKm,
        timeDiffMinutes: Math.round(timeDiffHours * 60),
        speedKmh,
        maxFeasibleSpeed
      }
    };
  }
  return null;
}

/**
 * 4. HIGH RISK MERCHANT CATEGORY:
 * Crypto, Darknet, Gambling, or Wire transfers to high-risk areas
 */
export function checkHighRiskCategory(tx) {
  const rule = getRule('HIGH_RISK_CATEGORY');
  if (!rule) return null;

  const highRiskCategories = ['CRYPTO', 'GAMBLING', 'OFFSHORE_WIRE', 'DARKNET_SERVICES'];
  const cat = (tx.merchant_category || '').toUpperCase();

  if (highRiskCategories.includes(cat)) {
    return {
      ruleCode: rule.code,
      ruleName: rule.name,
      weight: rule.weight,
      pointsAdded: rule.weight,
      explanation: `High-risk merchant sector flagged: Category '${cat}' associated with elevated money laundering and irreversible capital loss risk.`,
      details: { merchantCategory: cat, merchantName: tx.merchant_name }
    };
  }
  return null;
}

/**
 * 5. DORMANT ACCOUNT BURST:
 * Account dormant (>30 days) suddenly performing large transfer
 */
export function checkDormantBurst(tx, account) {
  const rule = getRule('DORMANT_BURST');
  if (!rule) return null;

  if (account.is_dormant || (account.last_active_at && (new Date(tx.timestamp).getTime() - new Date(account.last_active_at).getTime()) > 30 * 86400000)) {
    const minThreshold = rule.threshold || 1000;
    if (tx.amount >= minThreshold) {
      return {
        ruleCode: rule.code,
        ruleName: rule.name,
        weight: rule.weight,
        pointsAdded: rule.weight,
        explanation: `Dormant account reactivation alert: Account was dormant for over 30 days and suddenly initiated a high-value transfer of $${tx.amount.toFixed(2)} (Threshold: $${minThreshold}). Classic signature of account takeover.`,
        details: { isDormant: true, amount: tx.amount, minThreshold }
      };
    }
  }
  return null;
}

/**
 * 6. ODD HOURS ANOMALY:
 * High value between 1:00 AM and 4:30 AM
 */
export function checkOddHours(tx) {
  const rule = getRule('ODD_HOURS');
  if (!rule) return null;

  const txDate = new Date(tx.timestamp);
  const hour = txDate.getUTCHours(); // using UTC / consistent reference
  const thresholdAmount = rule.threshold || 500;

  if ((hour >= 1 && hour <= 4) && tx.amount >= thresholdAmount) {
    return {
      ruleCode: rule.code,
      ruleName: rule.name,
      weight: rule.weight,
      pointsAdded: rule.weight,
      explanation: `Off-hours activity alert: Large transfer ($${tx.amount.toFixed(2)}) executed during high-risk overnight window (${hour}:00 UTC).`,
      details: { hour, amount: tx.amount, thresholdAmount }
    };
  }
  return null;
}

/**
 * 7. DEVICE / IP MISMATCH:
 * Untrusted device or proxy/VPN indicator
 */
export function checkDeviceMismatch(tx) {
  const rule = getRule('DEVICE_MISMATCH');
  if (!rule) return null;

  if (tx.is_trusted_device === 0 || tx.is_trusted_device === false) {
    return {
      ruleCode: rule.code,
      ruleName: rule.name,
      weight: rule.weight,
      pointsAdded: rule.weight,
      explanation: `Untrusted client device: Transaction initiated from an unrecognized device (${tx.device_os || 'Unknown OS'}, ID: ${tx.device_id || 'Unknown'}) via IP ${tx.ip_address || 'Hidden'}.`,
      details: { deviceId: tx.device_id, deviceOs: tx.device_os, ip: tx.ip_address }
    };
  }
  return null;
}

/**
 * 8. CARD TESTING (MICRO-CHARGES):
 * Multiple small transactions in under 60 seconds
 */
export function checkCardTesting(tx, accountId) {
  const rule = getRule('CARD_TESTING');
  if (!rule) return null;

  if (tx.amount <= 5.0) {
    const windowSec = rule.time_window_seconds || 60;
    const threshold = rule.threshold || 3;
    const cutoffTime = new Date(new Date(tx.timestamp).getTime() - windowSec * 1000).toISOString();

    const countRow = db.prepare(`
      SELECT COUNT(*) as count FROM transactions
      WHERE account_id = ? AND amount <= 5.0 AND timestamp >= ? AND timestamp <= ?
    `).get(accountId, cutoffTime, tx.timestamp);

    const count = (countRow ? countRow.count : 0) + 1;

    if (count >= threshold) {
      return {
        ruleCode: rule.code,
        ruleName: rule.name,
        weight: rule.weight,
        pointsAdded: rule.weight,
        explanation: `Card testing pattern detected: ${count} micro-transactions (under $5.00) executed within ${windowSec} seconds. Likely automated bot validating stolen credentials.`,
        details: { count, threshold, windowSeconds: windowSec }
      };
    }
  }
  return null;
}
