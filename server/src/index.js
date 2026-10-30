import express from 'express';
import cors from 'cors';
import http from 'node:http';
import { initializeDatabase } from './db/database.js';
import { seedInitialData } from './db/seedData.js';
import { socketManager } from './ws/socketManager.js';

// Import Route Handlers
import transactionsRouter from './routes/transactions.js';
import investigationsRouter from './routes/investigations.js';
import rulesRouter from './routes/rules.js';
import auditRouter from './routes/audit.js';
import statsRouter from './routes/stats.js';
import simulatorRouter from './routes/simulator.js';
import customerAlertsRouter from './routes/customerAlerts.js';
import customersRouter from './routes/customers.js';

// 1. Initialize SQLite Database & Baseline Seed
initializeDatabase();
seedInitialData();

// 2. Setup Express & Middleware
const app = express();
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.options('*', cors());
app.use(express.json());

// 3. Register Routes
app.use('/api/transactions', transactionsRouter);
app.use('/api/investigations', investigationsRouter);
app.use('/api/rules', rulesRouter);
app.use('/api/audit-logs', auditRouter);
app.use('/api/stats', statsRouter);
app.use('/api/simulator', simulatorRouter);
app.use('/api/customer-alerts', customerAlertsRouter);
app.use('/api/customers', customersRouter);

// Health endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    system: 'FraudGuard AI Real-Time Transaction Monitoring Engine',
    uptime: process.uptime(),
    activeWsClients: socketManager.getClientCount(),
    timestamp: new Date().toISOString()
  });
});

// Serve frontend build if dist exists
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.resolve(__dirname, '../../client/dist');

if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/ws')) return next();
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// 4. Create HTTP Server & Attach WebSocket Server
const PORT = process.env.PORT || 4000;
const server = http.createServer(app);

socketManager.initialize(server);

server.listen(PORT, () => {
  console.log(`[FraudGuard AI] Engine listening on http://localhost:${PORT}`);
  console.log(`[FraudGuard AI] WebSocket stream ready on ws://localhost:${PORT}`);
});
