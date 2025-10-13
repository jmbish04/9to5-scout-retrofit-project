import { hasActivePythonClient, isPythonClient } from '../auth';

type DurableObjectState = any;

interface ClientInfo {
  type: string;
  lastPing: number;
}

interface PendingCommand {
  issuedBy: WebSocket;
  issuedAt: number;
}

export class ScrapeSocket {
  private state: DurableObjectState;
  private clients: Map<WebSocket, ClientInfo> = new Map();
  private pendingCommands: Map<string, PendingCommand> = new Map();

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  private sendToClients(predicate: (info: ClientInfo) => boolean, payload: string, exclude?: WebSocket): boolean {
    let delivered = false;
    for (const [socket, info] of this.clients.entries()) {
      if (socket === exclude) {
        continue;
      }
      if (!predicate(info)) {
        continue;
      }
      try {
        socket.send(payload);
        delivered = true;
      } catch (error) {
        console.warn('Failed to send message to client, removing from registry:', error);
        this.clients.delete(socket);
      }
    }
    return delivered;
  }

  private broadcastStatus(): void {
    const statusPayload = JSON.stringify({
      type: 'status',
      pythonConnected: hasActivePythonClient(this.clients),
      connections: this.clients.size,
    });
    this.sendToClients(() => true, statusPayload);
  }

  private acknowledgePing(socket: WebSocket, info: ClientInfo | undefined): void {
    socket.send(JSON.stringify({ type: 'pong' }));
    if (info) {
      info.lastPing = Date.now();
    }
  }

  private normaliseCommand(raw: unknown): { id: string; payload: any } {
    const commandId = `cmd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    if (typeof raw === 'string') {
      return { id: commandId, payload: { type: 'message', value: raw } };
    }

    if (raw && typeof raw === 'object') {
      return { id: commandId, payload: raw };
    }

    return { id: commandId, payload: { type: 'unknown', value: raw } };
  }

  private dispatchCommand(command: { id: string; payload: any }, issuedBy: WebSocket): boolean {
    const payload = JSON.stringify({ ...command.payload, commandId: command.id });
    const delivered = this.sendToClients((info) => isPythonClient(info), payload);

    if (delivered) {
      this.pendingCommands.set(command.id, {
        issuedBy,
        issuedAt: Date.now(),
      });
    }

    return delivered;
  }

  private handlePythonMessage(socket: WebSocket, data: string): void {
    let parsed: any = null;
    try {
      parsed = JSON.parse(data);
    } catch {
      parsed = data;
    }

    if (parsed && typeof parsed === 'object' && parsed.commandId) {
      const pending = this.pendingCommands.get(parsed.commandId);
      if (pending) {
        try {
          pending.issuedBy.send(JSON.stringify({ type: 'result', commandId: parsed.commandId, payload: parsed }));
        } catch (error) {
          console.warn('Failed to forward result to issuer:', error);
        }
        this.pendingCommands.delete(parsed.commandId);
      }
    }

    const observerPayload = JSON.stringify({ type: 'python-event', payload: parsed });
    this.sendToClients((info) => !isPythonClient(info), observerPayload, socket);
  }

  private handleObserverMessage(socket: WebSocket, raw: string | ArrayBuffer): void {
    const text = typeof raw === 'string' ? raw : new TextDecoder().decode(raw as ArrayBuffer);
    let parsed: unknown = text;

    try {
      parsed = JSON.parse(text);
    } catch {
      // leave as string
    }

    const command = this.normaliseCommand(parsed);
    const delivered = this.dispatchCommand(command, socket);

    if (!delivered) {
      socket.send(JSON.stringify({
        type: 'error',
        message: 'No Python clients are currently connected.',
        commandId: command.id,
      }));
      return;
    }

    socket.send(JSON.stringify({ type: 'ack', commandId: command.id }));

    const mirrorPayload = JSON.stringify({
      type: 'command-dispatched',
      commandId: command.id,
      payload: command.payload,
    });
    this.sendToClients((info) => !isPythonClient(info), mirrorPayload, socket);
  }

  private registerClient(socket: WebSocket, clientType: string): void {
    this.clients.set(socket, { type: clientType, lastPing: Date.now() });
    socket.send(JSON.stringify({
      type: 'welcome',
      clientType,
      pythonConnected: hasActivePythonClient(this.clients),
      connections: this.clients.size,
    }));
    this.broadcastStatus();
  }

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);

    if (url.pathname === '/ws' && req.headers.get('Upgrade') === 'websocket') {
      const pair = new WebSocketPair();
      const client = pair[0];
      const server = pair[1];
      server.accept();
      const clientType = url.searchParams.get('client') || 'observer';
      this.registerClient(server, clientType);

      server.addEventListener('close', () => {
        this.clients.delete(server);
        this.broadcastStatus();
      });

      server.addEventListener('message', (evt) => {
        const info = this.clients.get(server);
        if (!info) {
          return;
        }

        if (evt.data === 'ping') {
          this.acknowledgePing(server, info);
          return;
        }

        console.log(`Received message from client '${info.type}':`, evt.data);

        if (isPythonClient(info)) {
          this.handlePythonMessage(server, evt.data as string);
        } else {
          this.handleObserverMessage(server, evt.data as string | ArrayBuffer);
        }
      });

      return new Response(null, { status: 101, webSocket: client });
    }

    if (url.pathname === '/dispatch' && req.method === 'POST') {
      const message = await req.text();
      const dispatched = this.sendToClients((info) => isPythonClient(info), message);
      return new Response(dispatched ? 'sent' : 'no-python-clients', { status: dispatched ? 200 : 503 });
    }

    if (url.pathname === '/status' && req.method === 'GET') {
      return new Response(
        JSON.stringify({
          pythonConnected: hasActivePythonClient(this.clients),
          connections: this.clients.size,
        }),
        { headers: { 'Content-Type': 'application/json' } },
      );
    }

    return new Response('Not Found', { status: 404 });
  }
}
