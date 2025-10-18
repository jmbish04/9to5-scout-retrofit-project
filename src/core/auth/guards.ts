export function isPythonClient(info: { type: string }): boolean {
  return info.type === 'python';
}

export function hasActivePythonClient(clients: Map<WebSocket, { type: string; lastPing: number }>): boolean {
  const now = Date.now();
  const CLIENT_TIMEOUT_MS = 60_000;
  for (const [, info] of clients) {
    if (isPythonClient(info) && now - info.lastPing < CLIENT_TIMEOUT_MS) {
      return true;
    }
  }
  return false;
}
