import type { Env } from '../index';

export async function handleScrapeSocket(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);

  // Support auth via header or `?token=` query param for browser-based debugging
  let auth = request.headers.get('Authorization') || '';
  if (!auth) {
    const token = url.searchParams.get('token');
    if (token) {
      auth = `Bearer ${token}`;
    }
  }
  const expected = `Bearer ${env.API_AUTH_TOKEN}`;

  let diff = auth.length ^ expected.length;
  for (let i = 0; i < auth.length && i < expected.length; i++) {
    diff |= auth.charCodeAt(i) ^ expected.charCodeAt(i);
  }

  if (diff !== 0) {
    return new Response('Unauthorized', { status: 401 });
  }

  const id = env.SCRAPE_SOCKET.idFromName('default');
  const stub = env.SCRAPE_SOCKET.get(id);
  return stub.fetch(request);
}

export async function handleScrapeDispatch(request: Request, env: Env): Promise<Response> {
  const id = env.SCRAPE_SOCKET.idFromName('default');
  const stub = env.SCRAPE_SOCKET.get(id);
  const body = await request.text();
  return stub.fetch('https://dummy/dispatch', {
    method: 'POST',
    body,
    headers: { 'Content-Type': 'application/json' },
  });
}
