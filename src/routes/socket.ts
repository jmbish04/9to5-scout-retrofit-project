import type { Env } from "../domains/config/env/env.config";
import { verifyWebsocketAuth } from "../lib/auth";

export async function handleScrapeSocket(
  request: Request,
  env: Env
): Promise<Response> {
  const url = new URL(request.url);

  const authError = verifyWebsocketAuth(request, env, true);
  if (authError) {
    return authError;
  }

  const id = env.SCRAPE_SOCKET.idFromName("default");
  const stub = env.SCRAPE_SOCKET.get(id);
  return stub.fetch(request);
}

export async function handleScrapeDispatch(
  request: Request,
  env: Env
): Promise<Response> {
  const id = env.SCRAPE_SOCKET.idFromName("default");
  const stub = env.SCRAPE_SOCKET.get(id);
  const body = await request.text();
  return stub.fetch("https://dummy/dispatch", {
    method: "POST",
    body,
    headers: { "Content-Type": "application/json" },
  });
}
