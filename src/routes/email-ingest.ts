import type { Env } from '../lib/env';
import { handleEmailReceived } from './email';

export function isEmailIngestRequest(request: Request): boolean {
  const contentType = request.headers.get('content-type') || '';
  return request.method === 'POST' && contentType.includes('multipart/form-data');
}

export function handleEmailIngest(request: Request, env: Env): Promise<Response> {
  return handleEmailReceived(request, env);
}
