import { WebSocketServer, WebSocket } from 'ws';

class SocketManager {
  constructor() {
    this.wss = null;
    this.clients = new Set();
  }

  initialize(server) {
    this.wss = new WebSocketServer({ server });

    this.wss.on('connection', (ws, req) => {
      this.clients.add(ws);

      // Send initial welcome message
      ws.send(JSON.stringify({
        type: 'CONNECTED',
        payload: {
          message: 'Connected to FraudGuard AI Real-Time WebSocket Stream',
          activeClients: this.clients.size,
          timestamp: new Date().toISOString()
        }
      }));

      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message.toString());
          if (data.type === 'PING') {
            ws.send(JSON.stringify({ type: 'PONG', timestamp: new Date().toISOString() }));
          }
        } catch (e) {
          // ignore invalid json
        }
      });

      ws.on('close', () => {
        this.clients.delete(ws);
      });

      ws.on('error', () => {
        this.clients.delete(ws);
      });
    });
  }

  broadcast(type, payload) {
    if (!this.wss) return;

    const message = JSON.stringify({
      type,
      payload,
      timestamp: new Date().toISOString()
    });

    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(message);
        } catch (err) {
          this.clients.delete(client);
        }
      }
    }
  }

  getClientCount() {
    return this.clients.size;
  }
}

export const socketManager = new SocketManager();
export default socketManager;
