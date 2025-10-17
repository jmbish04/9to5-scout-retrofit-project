/**
 * Parses a URL pathname against a routing pattern to extract path parameters.
 *
 * @param pathname - The actual URL pathname (e.g., '/api/jobs/123').
 * @param pattern - The path pattern containing parameter placeholders (e.g., '/api/jobs/:id').
 * @returns An object mapping parameter names to their values, or null if the path doesn't match the pattern.
 */
export function parsePathParams(pathname: string, pattern: string): Record<string, string> | null {
  const pathParts = pathname.split('/').filter(Boolean);
  const patternParts = pattern.split('/').filter(Boolean);

  if (pathParts.length !== patternParts.length) {
    return null;
  }

  const params: Record<string, string> = {};

  for (let i = 0; i < patternParts.length; i++) {
    const patternPart = patternParts[i];
    const pathPart = pathParts[i];

    if (!patternPart || !pathPart) {
      return null;
    }

    if (patternPart.startsWith(':')) {
      params[patternPart.slice(1)] = decodeURIComponent(pathPart);
    } else if (patternPart !== pathPart) {
      return null;
    }
  }

  return params;
}

