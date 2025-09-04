import type { Job } from './types';

export interface TalentEnv {
  GCP_PROJECT_ID: string;
  GCP_SERVICE_ACCOUNT_JSON: string;
  GCP_TENANT_ID?: string;
  USAGE_TRACKER: KVNamespace;
}

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const TALENT_SCOPE = 'https://www.googleapis.com/auth/jobs';

function base64url(input: ArrayBuffer | string): string {
  const bytes = typeof input === 'string'
    ? new TextEncoder().encode(input)
    : new Uint8Array(input);
  let binary = '';
  for (const b of bytes) {
    binary += String.fromCharCode(b);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function getAccessToken(env: TalentEnv): Promise<string> {
  const serviceAccount = JSON.parse(env.GCP_SERVICE_ACCOUNT_JSON);
  const now = Math.floor(Date.now() / 1000);

  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: serviceAccount.client_email,
    scope: TALENT_SCOPE,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  };

  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const keyData = pemToArrayBuffer(serviceAccount.private_key);
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyData,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signingInput)
  );
  const jwt = `${signingInput}.${base64url(signature)}`;

  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion: jwt,
  });

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!res.ok) {
    console.error('Failed to obtain access token', res.status, await res.text());
    throw new Error('Failed to obtain access token');
  }

  const data = await res.json();
  return data.access_token as string;
}

async function checkAndIncrementUsage(env: TalentEnv): Promise<boolean> {
  const now = new Date();
  const key = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const current = parseInt((await env.USAGE_TRACKER.get(key)) || '0', 10);
  if (current >= 10000) {
    return false;
  }
  await env.USAGE_TRACKER.put(key, String(current + 1));
  return true;
}

export async function searchJobWithTalentApi(env: TalentEnv, jobTitle: string, companyName: string): Promise<Job | null> {
  const allowed = await checkAndIncrementUsage(env);
  if (!allowed) {
    console.warn('Talent API monthly usage limit reached');
    return null;
  }

  try {
    const accessToken = await getAccessToken(env);
    const tenantPath = env.GCP_TENANT_ID ? `/tenants/${env.GCP_TENANT_ID}` : '';
    const url = `https://jobs.googleapis.com/v4/projects/${env.GCP_PROJECT_ID}${tenantPath}/jobs:search`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jobQuery: {
          title: jobTitle,
          companyDisplayName: companyName,
        },
        searchMode: 'JOB_SEARCH',
        requestMetadata: {
          domain: 'example.com',
          sessionId: crypto.randomUUID(),
          userId: 'worker',
        },
      }),
    });

    if (!res.ok) {
      console.error('Talent API search failed', res.status, await res.text());
      return null;
    }

    const data = await res.json();
    const matched = data.jobs?.[0]?.job;
    if (!matched) {
      return null;
    }

    const job: Job = {
      title: matched.title,
      company: matched.companyDisplayName || companyName,
      url: matched.applicationInfo?.uris?.[0] || '',
      location: matched.addresses?.[0],
      description_md: matched.description,
      source: 'SCRAPED',
    };
    return job;
  } catch (err) {
    console.error('Talent API integration error', err);
    return null;
  }
}

