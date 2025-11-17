/**
 * @module public/js/client.js
 * @description
 * Standardized client for WebSocket and REST API interactions.
 * Handles health test UI updates and WebSocket reconnection logic.
 */

const API_BASE = window.location.origin;

// ============================================================================
// REST API Helpers
// ============================================================================

export async function fetchAPI(endpoint, options = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// ============================================================================
// Health Test Functions
// ============================================================================

export async function runTests() {
  const response = await fetchAPI('/api/tests/run', {
    method: 'POST',
    body: JSON.stringify({}),
  });
  return response.sessionUuid;
}

export async function loadTestDefs() {
  try {
    const defs = await fetchAPI('/api/tests/defs');
    renderTestDefs(defs);
  } catch (error) {
    console.error('Failed to load test definitions:', error);
    document.getElementById('tests-list').innerHTML = 
      `<div class="text-red-500">Failed to load tests: ${error.message}</div>`;
  }
}

export async function loadLatestSession() {
  try {
    const session = await fetchAPI('/api/tests/latest');
    renderSessionResults(session);
  } catch (error) {
    console.error('Failed to load latest session:', error);
    document.getElementById('session-results').innerHTML = 
      `<div class="text-gray-500">No test sessions available</div>`;
  }
}

function renderTestDefs(defs) {
  const container = document.getElementById('tests-list');
  if (!container) return;

  if (!defs || defs.length === 0) {
    container.innerHTML = '<div class="text-gray-500 dark:text-gray-400">No active tests</div>';
    return;
  }

  container.innerHTML = defs.map(def => {
    const severityColor = getSeverityColor(def.severity);
    return `
    <div class="flex items-center justify-between p-3 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm">
      <div>
        <div class="font-semibold text-gray-900 dark:text-white">${escapeHtml(def.name)}</div>
        <div class="text-sm text-gray-600 dark:text-gray-300">${escapeHtml(def.description)}</div>
        <div class="flex gap-2 mt-1">
          <span class="text-xs px-2 py-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 rounded">
            ${escapeHtml(def.category || 'uncategorized')}
          </span>
          <span class="text-xs px-2 py-1 bg-${severityColor}-100 dark:bg-${severityColor}-900 text-${severityColor}-800 dark:text-${severityColor}-200 rounded">
            ${escapeHtml(def.severity || 'medium')}
          </span>
        </div>
      </div>
      <div id="test-status-${def.id}" class="test-status-indicator">
        <span class="text-gray-400">⏳</span>
      </div>
    </div>
  `;
  }).join('');
}

function renderSessionResults(session) {
  const container = document.getElementById('session-results');
  if (!container) return;

  if (!session) {
    container.innerHTML = '<div class="text-gray-500 dark:text-gray-400">No test sessions yet</div>';
    return;
  }

  const passRate = session.totalTests > 0 
    ? Math.round((session.passed / session.totalTests) * 100) 
    : 0;

  container.innerHTML = `
    <div class="mb-4">
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm text-gray-600 dark:text-gray-300">Session: ${session.sessionUuid.substring(0, 8)}...</span>
        <span class="text-sm font-semibold ${session.failed > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}">
          ${session.passed}/${session.totalTests} passed (${passRate}%)
        </span>
      </div>
      <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div class="bg-green-600 dark:bg-green-500 h-2 rounded-full transition-all" style="width: ${passRate}%"></div>
      </div>
    </div>
    <div class="space-y-2">
      ${session.results.map(result => `
        <div class="p-4 border rounded-lg ${result.status === 'pass' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'}">
          <div class="flex items-center justify-between mb-2">
            <div class="font-semibold text-gray-900 dark:text-white">${escapeHtml(result.testName)}</div>
            <span class="px-2 py-1 rounded text-xs font-semibold ${result.status === 'pass' ? 'bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200' : 'bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200'}">
              ${result.status.toUpperCase()}
            </span>
          </div>
          ${result.status === 'fail' && result.aiHumanReadableErrorDescription ? `
            <div class="mt-2 p-2 bg-white dark:bg-gray-800 rounded text-sm border border-gray-200 dark:border-gray-700">
              <div class="font-semibold mb-1 text-gray-900 dark:text-white">Error:</div>
              <div class="text-gray-700 dark:text-gray-300">${escapeHtml(result.aiHumanReadableErrorDescription)}</div>
              ${result.aiPromptToFixError ? `
                <div class="mt-2 font-semibold text-gray-900 dark:text-white">Fix Steps:</div>
                <div class="text-gray-700 dark:text-gray-300 whitespace-pre-line">${escapeHtml(result.aiPromptToFixError)}</div>
              ` : ''}
            </div>
          ` : ''}
          <div class="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Duration: ${result.durationMs}ms | ${new Date(result.startedAt).toLocaleString()}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function getSeverityColor(severity) {
  const colors = {
    critical: 'red',
    high: 'orange',
    medium: 'yellow',
    low: 'green',
  };
  return colors[severity?.toLowerCase()] || 'gray';
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ============================================================================
// WebSocket Client
// ============================================================================

export class WSClient {
  constructor(roomId = 'default') {
    this.roomId = roomId;
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.listeners = new Map();
  }

  connect() {
    const wsUrl = `${API_BASE.replace('https://', 'wss://').replace('http://', 'ws://')}/ws?room=${this.roomId}`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      this.emit('open', {});
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.emit('message', message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.emit('error', error);
    };

    this.ws.onclose = () => {
      console.log('WebSocket closed');
      this.emit('close', {});
      this.attemptReconnect();
    };
  }

  send(type, payload, meta = {}) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type,
        payload,
        meta: {
          timestamp: new Date().toISOString(),
          ...meta,
        },
      }));
    } else {
      console.warn('WebSocket not connected');
    }
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000);
      setTimeout(() => {
        console.log(`Reconnecting... (attempt ${this.reconnectAttempts})`);
        this.connect();
      }, delay);
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// Export default WS client instance
export const wsClient = new WSClient('health-dashboard');

