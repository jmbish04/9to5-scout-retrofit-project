/**
 * @fileoverview URL Helper Utilities
 *
 * Utility functions for URL manipulation, parsing, and validation
 * across all domains in the 9to5 Scout platform.
 *
 * @author 9to5 Scout AI Team
 * @version 1.0.0
 * @since 2024-01-01
 */

/**
 * URL utility functions
 */
export class UrlUtils {
  /**
   * Parses a URL string into its components
   */
  static parseUrl(url: string): {
    protocol: string;
    hostname: string;
    port: string;
    pathname: string;
    search: string;
    hash: string;
    origin: string;
  } | null {
    try {
      const urlObj = new URL(url);
      return {
        protocol: urlObj.protocol,
        hostname: urlObj.hostname,
        port: urlObj.port,
        pathname: urlObj.pathname,
        search: urlObj.search,
        hash: urlObj.hash,
        origin: urlObj.origin,
      };
    } catch {
      return null;
    }
  }

  /**
   * Checks if a URL is valid
   */
  static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Checks if a URL is absolute
   */
  static isAbsoluteUrl(url: string): boolean {
    if (!this.isValidUrl(url)) return false;

    try {
      const urlObj = new URL(url);
      return urlObj.protocol !== "" && urlObj.hostname !== "";
    } catch {
      return false;
    }
  }

  /**
   * Checks if a URL is relative
   */
  static isRelativeUrl(url: string): boolean {
    return !this.isAbsoluteUrl(url);
  }

  /**
   * Converts a relative URL to absolute
   */
  static toAbsoluteUrl(relativeUrl: string, baseUrl: string): string | null {
    try {
      return new URL(relativeUrl, baseUrl).toString();
    } catch {
      return null;
    }
  }

  /**
   * Converts an absolute URL to relative
   */
  static toRelativeUrl(url: string, baseUrl: string): string | null {
    try {
      const urlObj = new URL(url);
      const baseObj = new URL(baseUrl);

      if (urlObj.origin !== baseObj.origin) {
        return url; // Different origin, return as-is
      }

      return urlObj.pathname + urlObj.search + urlObj.hash;
    } catch {
      return null;
    }
  }

  /**
   * Extracts the domain from a URL
   */
  static extractDomain(url: string): string | null {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return null;
    }
  }

  /**
   * Extracts the path from a URL
   */
  static extractPath(url: string): string | null {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname;
    } catch {
      return null;
    }
  }

  /**
   * Extracts the query parameters from a URL
   */
  static extractQueryParams(url: string): Record<string, string> {
    try {
      const urlObj = new URL(url);
      const params: Record<string, string> = {};

      urlObj.searchParams.forEach((value, key) => {
        params[key] = value;
      });

      return params;
    } catch {
      return {};
    }
  }

  /**
   * Extracts the hash from a URL
   */
  static extractHash(url: string): string | null {
    try {
      const urlObj = new URL(url);
      return urlObj.hash;
    } catch {
      return null;
    }
  }

  /**
   * Builds a URL from components
   */
  static buildUrl(components: {
    protocol?: string;
    hostname: string;
    port?: string;
    pathname?: string;
    search?: string;
    hash?: string;
  }): string {
    const {
      protocol = "https:",
      hostname,
      port = "",
      pathname = "/",
      search = "",
      hash = "",
    } = components;

    let url = `${protocol}//${hostname}`;

    if (port) {
      url += `:${port}`;
    }

    url += pathname;

    if (search) {
      url += search.startsWith("?") ? search : `?${search}`;
    }

    if (hash) {
      url += hash.startsWith("#") ? hash : `#${hash}`;
    }

    return url;
  }

  /**
   * Adds query parameters to a URL
   */
  static addQueryParams(
    url: string,
    params: Record<string, string | number | boolean>
  ): string {
    try {
      const urlObj = new URL(url);

      Object.entries(params).forEach(([key, value]) => {
        urlObj.searchParams.set(key, String(value));
      });

      return urlObj.toString();
    } catch {
      return url;
    }
  }

  /**
   * Removes query parameters from a URL
   */
  static removeQueryParams(url: string, paramNames: string[]): string {
    try {
      const urlObj = new URL(url);

      paramNames.forEach((paramName) => {
        urlObj.searchParams.delete(paramName);
      });

      return urlObj.toString();
    } catch {
      return url;
    }
  }

  /**
   * Updates query parameters in a URL
   */
  static updateQueryParams(
    url: string,
    params: Record<string, string | number | boolean>
  ): string {
    try {
      const urlObj = new URL(url);

      Object.entries(params).forEach(([key, value]) => {
        if (value === null || value === undefined || value === "") {
          urlObj.searchParams.delete(key);
        } else {
          urlObj.searchParams.set(key, String(value));
        }
      });

      return urlObj.toString();
    } catch {
      return url;
    }
  }

  /**
   * Normalizes a URL by removing trailing slashes and normalizing path
   */
  static normalizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);

      // Normalize pathname
      let pathname = urlObj.pathname;
      if (pathname.endsWith("/") && pathname !== "/") {
        pathname = pathname.slice(0, -1);
      }

      // Rebuild URL
      return this.buildUrl({
        protocol: urlObj.protocol,
        hostname: urlObj.hostname,
        port: urlObj.port,
        pathname,
        search: urlObj.search,
        hash: urlObj.hash,
      });
    } catch {
      return url;
    }
  }

  /**
   * Checks if two URLs are the same (ignoring protocol, port, trailing slashes)
   */
  static isSameUrl(url1: string, url2: string): boolean {
    try {
      const url1Obj = new URL(url1);
      const url2Obj = new URL(url2);

      // Normalize both URLs
      const normalized1 = this.normalizeUrl(url1);
      const normalized2 = this.normalizeUrl(url2);

      return normalized1 === normalized2;
    } catch {
      return false;
    }
  }

  /**
   * Checks if a URL is secure (HTTPS)
   */
  static isSecureUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === "https:";
    } catch {
      return false;
    }
  }

  /**
   * Checks if a URL is a localhost URL
   */
  static isLocalhostUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname === "localhost" || urlObj.hostname === "127.0.0.1";
    } catch {
      return false;
    }
  }

  /**
   * Checks if a URL is an IP address
   */
  static isIpUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      const ipRegex =
        /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
      return ipRegex.test(urlObj.hostname);
    } catch {
      return false;
    }
  }

  /**
   * Extracts the file extension from a URL
   */
  static extractFileExtension(url: string): string | null {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const lastDot = pathname.lastIndexOf(".");
      const lastSlash = pathname.lastIndexOf("/");

      if (lastDot > lastSlash && lastDot !== -1) {
        return pathname.substring(lastDot + 1).toLowerCase();
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Checks if a URL is a file URL
   */
  static isFileUrl(url: string): boolean {
    const extension = this.extractFileExtension(url);
    return extension !== null;
  }

  /**
   * Extracts the subdomain from a URL
   */
  static extractSubdomain(url: string): string | null {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;
      const parts = hostname.split(".");

      if (parts.length > 2) {
        return parts[0];
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Extracts the top-level domain from a URL
   */
  static extractTld(url: string): string | null {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;
      const parts = hostname.split(".");

      if (parts.length >= 2) {
        return parts[parts.length - 1];
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Encodes a URL component
   */
  static encodeUrlComponent(str: string): string {
    return encodeURIComponent(str);
  }

  /**
   * Decodes a URL component
   */
  static decodeUrlComponent(str: string): string {
    try {
      return decodeURIComponent(str);
    } catch {
      return str;
    }
  }

  /**
   * Encodes a URL
   */
  static encodeUrl(url: string): string {
    try {
      return encodeURI(url);
    } catch {
      return url;
    }
  }

  /**
   * Decodes a URL
   */
  static decodeUrl(url: string): string {
    try {
      return decodeURI(url);
    } catch {
      return url;
    }
  }
}
