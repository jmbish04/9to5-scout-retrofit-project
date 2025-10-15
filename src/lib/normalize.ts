import { decode } from 'html-entities';

const MULTI_LEVEL_TLDS = new Set([
  'co.uk',
  'com.au',
  'co.jp',
  'com.br',
  'co.in',
  'com.sg',
  'com.hk',
  'com.tr',
  'com.mx',
  'co.nz',
]);

function ensureUrl(value: string): URL | null {
  if (!value || typeof value !== 'string') {
    return null;
  }

  try {
    return new URL(value);
  } catch (primaryError) {
    try {
      return new URL(`https://${value}`);
    } catch (secondaryError) {
      console.warn('Unable to construct URL from value:', value, primaryError, secondaryError);
      return null;
    }
  }
}

function getRegistrableDomain(host: string): string {
  const normalized = host.toLowerCase();
  const stripped = normalized.replace(/^www\d?\./, '');
  const segments = stripped.split('.').filter(Boolean);

  if (segments.length <= 2) {
    return stripped;
  }

  const lastTwo = segments.slice(-2).join('.');
  const lastThree = segments.slice(-3).join('.');

  for (const suffix of MULTI_LEVEL_TLDS) {
    if (lastTwo === suffix) {
      return segments.slice(-3).join('.');
    }
    if (lastThree.endsWith(suffix)) {
      const suffixParts = suffix.split('.').length;
      return segments.slice(-(suffixParts + 1)).join('.');
    }
  }

  return lastTwo;
}

export function normalizeDomain(value: string | null | undefined): string | null {
  const url = value ? ensureUrl(value) : null;

  if (!url) {
    return null;
  }

  const host = url.hostname.toLowerCase();

  if (host === 'localhost' || /^[0-9.]+$/.test(host)) {
    return host;
  }

  return getRegistrableDomain(host);
}

export function coalesceCareersUrl(websiteUrl?: string | null, existingCareersUrl?: string | null): string | null {
  if (existingCareersUrl) {
    return existingCareersUrl;
  }

  const url = websiteUrl ? ensureUrl(websiteUrl) : null;

  if (!url) {
    return null;
  }

  const candidates = [
    '/careers',
    '/jobs',
    '/company/careers',
    '/careers/jobs',
    '/about/careers',
  ];

  for (const path of candidates) {
    const candidate = new URL(url.toString());
    candidate.pathname = path;
    if (!candidate.pathname.endsWith('/')) {
      candidate.pathname = `${candidate.pathname}`;
    }
    return candidate.toString();
  }

  return url.toString();
}

export function textFromHTML(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }

  const withoutScripts = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--([\s\S]*?)-->/g, ' ');

  const text = withoutScripts
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\/?p[^>]*>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n• ')
    .replace(/<\/?h[1-6][^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');

  const decoded = decode(text, { level: 'html5' });

  return decoded
    .replace(/\r/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/[\t\f]+/g, ' ')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join('\n');
}
