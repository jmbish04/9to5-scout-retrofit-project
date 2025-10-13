type DurableObjectState = any;

export class ScrapeSocket {
  private state: DurableObjectState;
  private clients: Map<WebSocket, { type: string; lastPing: number }> = new Map();

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);

    if (url.pathname === '/ws' && req.headers.get('Upgrade') === 'websocket') {
      const pair = new WebSocketPair();
      const client = pair[0];
      const server = pair[1];
      server.accept();
      const clientType = url.searchParams.get('client') || 'unknown';
      this.clients.set(server, { type: clientType, lastPing: Date.now() });
      server.addEventListener('close', () => {
        this.clients.delete(server);
      });
      server.addEventListener('message', (evt) => {
        if (evt.data === 'ping') {
          server.send(JSON.stringify({ type: 'pong' }));
          const info = this.clients.get(server);
          if (info) {
            info.lastPing = Date.now();
          }
          return;
        }
        for (const ws of this.clients.keys()) {
          if (ws !== server) {
            try {
              ws.send(evt.data);
            } catch {
              this.clients.delete(ws);
            }
          }
        }
      });
      return new Response(null, { status: 101, webSocket: client });
    }

    if (url.pathname === '/dispatch' && req.method === 'POST') {
      const message = await req.text();
      for (const ws of this.clients.keys()) {
        try {
          ws.send(message);
        } catch {
          this.clients.delete(ws);
        }
      }
      return new Response('sent', { status: 200 });
    }

    if (url.pathname === '/status' && req.method === 'GET') {
      const now = Date.now();
      const CLIENT_TIMEOUT_MS = 60_000;
      const pythonConnected = Array.from(this.clients.entries()).some(([, info]) =>
        info.type === 'python' && now - info.lastPing < CLIENT_TIMEOUT_MS,
      );
      return new Response(
        JSON.stringify({
          pythonConnected,
          connections: this.clients.size,
        }),
        { headers: { 'Content-Type': 'application/json' } },
      );
    }

    return new Response('Not Found', { status: 404 });
  }
}
