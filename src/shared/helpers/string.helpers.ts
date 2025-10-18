/**
 * @fileoverview String Helper Utilities
 *
 * Utility functions for string manipulation, validation, and formatting
 * across all domains in the 9to5 Scout platform.
 *
 * @author 9to5 Scout AI Team
 * @version 1.0.0
 * @since 2024-01-01
 */

/**
 * String utility functions
 */
export class StringUtils {
  /**
   * Checks if a string is empty or null/undefined
   */
  static isEmpty(str: string | null | undefined): boolean {
    return !str || str.trim().length === 0;
  }

  /**
   * Checks if a string is not empty
   */
  static isNotEmpty(str: string | null | undefined): boolean {
    return !this.isEmpty(str);
  }

  /**
   * Truncates a string to a specified length
   */
  static truncate(str: string, length: number, suffix = "..."): string {
    if (this.isEmpty(str) || str.length <= length) return str;
    return str.substring(0, length - suffix.length) + suffix;
  }

  /**
   * Capitalizes the first letter of a string
   */
  static capitalize(str: string): string {
    if (this.isEmpty(str)) return str;
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  /**
   * Converts a string to title case
   */
  static toTitleCase(str: string): string {
    if (this.isEmpty(str)) return str;

    return str
      .toLowerCase()
      .split(" ")
      .map((word) => this.capitalize(word))
      .join(" ");
  }

  /**
   * Converts a string to kebab-case
   */
  static toKebabCase(str: string): string {
    if (this.isEmpty(str)) return str;

    return str
      .replace(/([a-z])([A-Z])/g, "$1-$2")
      .replace(/[\s_]+/g, "-")
      .toLowerCase();
  }

  /**
   * Converts a string to snake_case
   */
  static toSnakeCase(str: string): string {
    if (this.isEmpty(str)) return str;

    return str
      .replace(/([a-z])([A-Z])/g, "$1_$2")
      .replace(/[\s-]+/g, "_")
      .toLowerCase();
  }

  /**
   * Converts a string to camelCase
   */
  static toCamelCase(str: string): string {
    if (this.isEmpty(str)) return str;

    return str
      .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
        return index === 0 ? word.toLowerCase() : word.toUpperCase();
      })
      .replace(/\s+/g, "");
  }

  /**
   * Converts a string to PascalCase
   */
  static toPascalCase(str: string): string {
    if (this.isEmpty(str)) return str;

    return str
      .replace(/(?:^\w|[A-Z]|\b\w)/g, (word) => word.toUpperCase())
      .replace(/\s+/g, "");
  }

  /**
   * Removes all whitespace from a string
   */
  static removeWhitespace(str: string): string {
    if (this.isEmpty(str)) return str;
    return str.replace(/\s+/g, "");
  }

  /**
   * Normalizes whitespace in a string
   */
  static normalizeWhitespace(str: string): string {
    if (this.isEmpty(str)) return str;
    return str.replace(/\s+/g, " ").trim();
  }

  /**
   * Escapes HTML special characters
   */
  static escapeHtml(str: string): string {
    if (this.isEmpty(str)) return str;

    const htmlEscapes: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return str.replace(/[&<>"']/g, (match) => htmlEscapes[match]);
  }

  /**
   * Unescapes HTML special characters
   */
  static unescapeHtml(str: string): string {
    if (this.isEmpty(str)) return str;

    const htmlUnescapes: Record<string, string> = {
      "&amp;": "&",
      "&lt;": "<",
      "&gt;": ">",
      "&quot;": '"',
      "&#39;": "'",
    };

    return str.replace(
      /&(amp|lt|gt|quot|#39);/g,
      (match) => htmlUnescapes[match]
    );
  }

  /**
   * Generates a random string of specified length
   */
  static random(
    length: number,
    charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  ): string {
    let result = "";
    for (let i = 0; i < length; i++) {
      result += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return result;
  }

  /**
   * Generates a UUID v4
   */
  static uuid(): string {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Checks if a string is a valid email
   */
  static isValidEmail(str: string): boolean {
    if (this.isEmpty(str)) return false;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(str);
  }

  /**
   * Checks if a string is a valid URL
   */
  static isValidUrl(str: string): boolean {
    if (this.isEmpty(str)) return false;

    try {
      new URL(str);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Extracts domain from a URL
   */
  static extractDomain(url: string): string | null {
    if (!this.isValidUrl(url)) return null;

    try {
      return new URL(url).hostname;
    } catch {
      return null;
    }
  }

  /**
   * Masks sensitive information in a string
   */
  static mask(str: string, visibleChars = 4, maskChar = "*"): string {
    if (this.isEmpty(str) || str.length <= visibleChars) return str;

    const visible = str.slice(0, visibleChars);
    const masked = maskChar.repeat(str.length - visibleChars);
    return visible + masked;
  }

  /**
   * Masks an email address
   */
  static maskEmail(email: string): string {
    if (!this.isValidEmail(email)) return email;

    const [local, domain] = email.split("@");
    const maskedLocal = this.mask(local, 2);
    return `${maskedLocal}@${domain}`;
  }

  /**
   * Masks a phone number
   */
  static maskPhone(phone: string): string {
    if (this.isEmpty(phone)) return phone;

    const digits = phone.replace(/\D/g, "");
    if (digits.length < 4) return phone;

    const visible = digits.slice(-4);
    const masked = "*".repeat(digits.length - 4);
    return phone.replace(digits, masked + visible);
  }

  /**
   * Pluralizes a word based on count
   */
  static pluralize(word: string, count: number, pluralForm?: string): string {
    if (count === 1) return word;
    return pluralForm || word + "s";
  }

  /**
   * Converts bytes to human readable format
   */
  static formatBytes(bytes: number, decimals = 2): string {
    if (bytes === 0) return "0 Bytes";

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  }

  /**
   * Converts a number to ordinal string
   */
  static toOrdinal(num: number): string {
    const j = num % 10;
    const k = num % 100;

    if (j === 1 && k !== 11) {
      return num + "st";
    }
    if (j === 2 && k !== 12) {
      return num + "nd";
    }
    if (j === 3 && k !== 13) {
      return num + "rd";
    }
    return num + "th";
  }
}
