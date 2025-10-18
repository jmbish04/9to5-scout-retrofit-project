import type { Env } from '../../config/env';

export interface RouteGuard {
  method: string;
  path: string | RegExp;
}

type SupportedSecret = 'API_AUTH_TOKEN' | 'BROWSER_RENDERING_TOKEN';

function constantTimeEquals(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  const maxLen = Math.max(a.length, b.length);

  for (let i = 0; i < maxLen; i++) {
    const aChar = i < a.length ? a.charCodeAt(i) : 0;
    const bChar = i < b.length ? b.charCodeAt(i) : 0;
    diff |= aChar ^ bChar;
  }

  return diff === 0;
}

function buildExpectedBearer(token: string): string {
  return `Bearer ${token}`;
}

function ensureSecret(env: Env, key: SupportedSecret): string {
  const raw = (env as any)[key];
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error(`${key} is not configured in the worker environment.`);
  }
  return raw.trim();
}

function normalizePathname(pathname: string): string {
  if (!pathname) {
    return '/';
  }
  const trimmed = pathname.endsWith('/') && pathname.length > 1
    ? pathname.slice(0, -1)
    : pathname;
  return trimmed || '/';
}

function routeMatches(pathname: string, method: string, guard: RouteGuard): boolean {
  if (guard.method.toUpperCase() !== 'ANY' && guard.method.toUpperCase() !== method.toUpperCase()) {
    return false;
  }

  if (typeof guard.path === 'string') {
    const normalizedPath = normalizePathname(pathname);
    const guardPath = normalizePathname(guard.path.endsWith('*') ? guard.path.slice(0, -1) : guard.path);

    if (guard.path.endsWith('*')) {
      return normalizedPath.startsWith(guardPath) && (normalizedPath.length === guardPath.length || normalizedPath[guardPath.length] === '/');
    }

    return normalizedPath === guardPath;
  }

  return guard.path.test(pathname);
}

function extractBearerToken(request: Request, allowQueryToken = false): string | null {
  const header = request.headers.get('Authorization');
  if (header && header.trim().length > 0) {
    return header.trim();
  }

  if (allowQueryToken) {
    const url = new URL(request.url);
    const token = url.searchParams.get('token');
    if (token && token.trim().length > 0) {
      return buildExpectedBearer(token.trim());
    }
  }

  return null;
}

function unauthorizedJsonResponse(): Response {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: {
      'Content-Type': 'application/json',
      'WWW-Authenticate': 'Bearer',
    },
  });
}

export function assertApiToken(env: Env): string {
  return ensureSecret(env, 'API_AUTH_TOKEN');
}

export function assertBrowserRenderingToken(env: Env): string {
  return ensureSecret(env, 'BROWSER_RENDERING_TOKEN');
}

export interface ApiAuthOptions {
  allowList?: RouteGuard[];
  allowQueryToken?: boolean;
}

export function requireApiAuth(request: Request, env: Env, options: ApiAuthOptions = {}): Response | null {
  const allowList = options.allowList ?? [];
  const url = new URL(request.url);
  const pathname = normalizePathname(url.pathname);
  const method = request.method.toUpperCase();

  if (method === 'OPTIONS') {
    return null;
  }

  const isAllowed = allowList.some((guard) => routeMatches(pathname, method, guard));
  if (isAllowed) {
    return null;
  }

  const expectedBearer = buildExpectedBearer(assertApiToken(env));
  const provided = extractBearerToken(request, options.allowQueryToken === true);

  if (!provided || !constantTimeEquals(provided, expectedBearer)) {
    return unauthorizedJsonResponse();
  }

  return null;
}

export function verifyWebsocketAuth(request: Request, env: Env, allowQueryToken = false): Response | null {
  const expectedBearer = buildExpectedBearer(assertApiToken(env));
  const provided = extractBearerToken(request, allowQueryToken);

  if (!provided || !constantTimeEquals(provided, expectedBearer)) {
    return new Response('Unauthorized', { status: 401 });
  }

  return null;
}
