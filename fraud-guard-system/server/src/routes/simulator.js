import { Router } from 'express';
import { simulator } from '../simulator/transactionSimulator.js';

const router = Router();

// GET /api/simulator/status
router.get('/status', (req, res) => {
  res.json({
    success: true,
    data: {
      isRunning: simulator.isRunning,
      intervalMs: simulator.intervalMs
    }
  });
});

// POST /api/simulator/start
router.post('/start', (req, res) => {
  const { intervalMs = 2000 } = req.body;
  simulator.start(intervalMs);
  res.json({
    success: true,
    message: 'Transaction simulator started',
    data: { isRunning: simulator.isRunning, intervalMs: simulator.intervalMs }
  });
});

// POST /api/simulator/stop
router.post('/stop', (req, res) => {
  simulator.stop();
  res.json({
    success: true,
    message: 'Transaction simulator stopped',
    data: { isRunning: simulator.isRunning, intervalMs: simulator.intervalMs }
  });
});

// POST /api/simulator/speed
router.post('/speed', (req, res) => {
  const { intervalMs } = req.body;
  if (!intervalMs) {
    return res.status(400).json({ success: false, error: 'intervalMs is required' });
  }
  simulator.setSpeed(Number(intervalMs));
  res.json({
    success: true,
    data: { isRunning: simulator.isRunning, intervalMs: simulator.intervalMs }
  });
});

// POST /api/simulator/inject-attack
router.post('/inject-attack', (req, res) => {
  const { scenario } = req.body;
  const validScenarios = [
    'IMPOSSIBLE_TRAVEL',
    'ACCOUNT_TAKEOVER_WIRE',
    'CARD_TESTING_BURST',
    'MIDNIGHT_HIGH_VALUE_GAMBLING'
  ];

  if (!scenario || !validScenarios.includes(scenario)) {
    return res.status(400).json({
      success: false,
      error: `Invalid scenario. Choose from: ${validScenarios.join(', ')}`
    });
  }

  const results = simulator.injectScenario(scenario);
  res.json({
    success: true,
    message: `Scenario '${scenario}' injected successfully`,
    count: results.length,
    data: results
  });
});

export default router;
