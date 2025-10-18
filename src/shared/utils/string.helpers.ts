/**
 * @fileoverview String Helper Utilities
 *
 * Utility functions for string manipulation, validation, and transformation
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
   * Capitalizes the first letter of a string
   * @param str String to capitalize
   * @returns Capitalized string
   */
  static capitalize(str: string): string {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  /**
   * Capitalizes the first letter of each word in a string
   * @param str String to capitalize
   * @returns String with each word capitalized
   */
  static capitalizeWords(str: string): string {
    if (!str) return str;
    return str
      .split(" ")
      .map((word) => this.capitalize(word))
      .join(" ");
  }

  /**
   * Converts a string to camelCase
   * @param str String to convert
   * @returns camelCase string
   */
  static toCamelCase(str: string): string {
    if (!str) return str;
    return str
      .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
        return index === 0 ? word.toLowerCase() : word.toUpperCase();
      })
      .replace(/\s+/g, "");
  }

  /**
   * Converts a string to PascalCase
   * @param str String to convert
   * @returns PascalCase string
   */
  static toPascalCase(str: string): string {
    if (!str) return str;
    return str
      .replace(/(?:^\w|[A-Z]|\b\w)/g, (word) => word.toUpperCase())
      .replace(/\s+/g, "");
  }

  /**
   * Converts a string to kebab-case
   * @param str String to convert
   * @returns kebab-case string
   */
  static toKebabCase(str: string): string {
    if (!str) return str;
    return str
      .replace(/([a-z])([A-Z])/g, "$1-$2")
      .replace(/[\s_]+/g, "-")
      .toLowerCase();
  }

  /**
   * Converts a string to snake_case
   * @param str String to convert
   * @returns snake_case string
   */
  static toSnakeCase(str: string): string {
    if (!str) return str;
    return str
      .replace(/([a-z])([A-Z])/g, "$1_$2")
      .replace(/[\s-]+/g, "_")
      .toLowerCase();
  }

  /**
   * Converts a string to Title Case
   * @param str String to convert
   * @returns Title Case string
   */
  static toTitleCase(str: string): string {
    if (!str) return str;
    return str
      .toLowerCase()
      .split(" ")
      .map((word) => this.capitalize(word))
      .join(" ");
  }

  /**
   * Truncates a string to a specified length
   * @param str String to truncate
   * @param length Maximum length
   * @param suffix Suffix to add when truncating
   * @returns Truncated string
   */
  static truncate(str: string, length: number, suffix: string = "..."): string {
    if (!str || str.length <= length) return str;
    return str.slice(0, length - suffix.length) + suffix;
  }

  /**
   * Truncates a string to a specified length at word boundaries
   * @param str String to truncate
   * @param length Maximum length
   * @param suffix Suffix to add when truncating
   * @returns Truncated string
   */
  static truncateWords(
    str: string,
    length: number,
    suffix: string = "..."
  ): string {
    if (!str || str.length <= length) return str;

    const truncated = str.slice(0, length - suffix.length);
    const lastSpace = truncated.lastIndexOf(" ");

    if (lastSpace > 0) {
      return truncated.slice(0, lastSpace) + suffix;
    }

    return truncated + suffix;
  }

  /**
   * Removes HTML tags from a string
   * @param str String to clean
   * @returns String without HTML tags
   */
  static stripHtml(str: string): string {
    if (!str) return str;
    return str.replace(/<[^>]*>/g, "");
  }

  /**
   * Removes extra whitespace from a string
   * @param str String to clean
   * @returns String with normalized whitespace
   */
  static normalizeWhitespace(str: string): string {
    if (!str) return str;
    return str.replace(/\s+/g, " ").trim();
  }

  /**
   * Removes all whitespace from a string
   * @param str String to clean
   * @returns String without whitespace
   */
  static removeWhitespace(str: string): string {
    if (!str) return str;
    return str.replace(/\s/g, "");
  }

  /**
   * Escapes HTML special characters
   * @param str String to escape
   * @returns HTML-escaped string
   */
  static escapeHtml(str: string): string {
    if (!str) return str;
    const htmlEscapes: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return str.replace(/[&<>"']/g, (char) => htmlEscapes[char] || char);
  }

  /**
   * Unescapes HTML special characters
   * @param str String to unescape
   * @returns HTML-unescaped string
   */
  static unescapeHtml(str: string): string {
    if (!str) return str;
    const htmlUnescapes: Record<string, string> = {
      "&amp;": "&",
      "&lt;": "<",
      "&gt;": ">",
      "&quot;": '"',
      "&#39;": "'",
    };
    return str.replace(
      /&(amp|lt|gt|quot|#39);/g,
      (entity) => htmlUnescapes[entity] || entity
    );
  }

  /**
   * Generates a random string
   * @param length Length of the string
   * @param charset Character set to use
   * @returns Random string
   */
  static random(
    length: number,
    charset: string = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  ): string {
    let result = "";
    for (let i = 0; i < length; i++) {
      result += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return result;
  }

  /**
   * Generates a random alphanumeric string
   * @param length Length of the string
   * @returns Random alphanumeric string
   */
  static randomAlphanumeric(length: number): string {
    return this.random(
      length,
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    );
  }

  /**
   * Generates a random numeric string
   * @param length Length of the string
   * @returns Random numeric string
   */
  static randomNumeric(length: number): string {
    return this.random(length, "0123456789");
  }

  /**
   * Generates a random alphabetic string
   * @param length Length of the string
   * @returns Random alphabetic string
   */
  static randomAlphabetic(length: number): string {
    return this.random(
      length,
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
    );
  }

  /**
   * Checks if a string is empty or contains only whitespace
   * @param str String to check
   * @returns True if string is empty or whitespace
   */
  static isEmpty(str: string): boolean {
    return !str || str.trim().length === 0;
  }

  /**
   * Checks if a string is not empty and contains non-whitespace characters
   * @param str String to check
   * @returns True if string is not empty
   */
  static isNotEmpty(str: string): boolean {
    return !this.isEmpty(str);
  }

  /**
   * Checks if a string contains only alphabetic characters
   * @param str String to check
   * @returns True if string contains only alphabetic characters
   */
  static isAlphabetic(str: string): boolean {
    if (!str) return false;
    return /^[a-zA-Z]+$/.test(str);
  }

  /**
   * Checks if a string contains only numeric characters
   * @param str String to check
   * @returns True if string contains only numeric characters
   */
  static isNumeric(str: string): boolean {
    if (!str) return false;
    return /^[0-9]+$/.test(str);
  }

  /**
   * Checks if a string contains only alphanumeric characters
   * @param str String to check
   * @returns True if string contains only alphanumeric characters
   */
  static isAlphanumeric(str: string): boolean {
    if (!str) return false;
    return /^[a-zA-Z0-9]+$/.test(str);
  }

  /**
   * Checks if a string is a valid email format
   * @param str String to check
   * @returns True if string is a valid email format
   */
  static isEmail(str: string): boolean {
    if (!str) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(str);
  }

  /**
   * Checks if a string is a valid URL format
   * @param str String to check
   * @returns True if string is a valid URL format
   */
  static isUrl(str: string): boolean {
    if (!str) return false;
    try {
      new URL(str);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Checks if a string is a valid UUID format
   * @param str String to check
   * @returns True if string is a valid UUID format
   */
  static isUuid(str: string): boolean {
    if (!str) return false;
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  }

  /**
   * Checks if a string is a valid slug format
   * @param str String to check
   * @returns True if string is a valid slug format
   */
  static isSlug(str: string): boolean {
    if (!str) return false;
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    return slugRegex.test(str);
  }

  /**
   * Converts a string to a slug
   * @param str String to convert
   * @returns Slug string
   */
  static toSlug(str: string): string {
    if (!str) return str;
    return str
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "") // Remove special characters
      .replace(/[\s_-]+/g, "-") // Replace spaces and underscores with hyphens
      .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
  }

  /**
   * Pads a string to a specified length
   * @param str String to pad
   * @param length Target length
   * @param padString String to pad with
   * @param padStart Whether to pad at the start
   * @returns Padded string
   */
  static pad(
    str: string,
    length: number,
    padString: string = " ",
    padStart: boolean = true
  ): string {
    if (!str) return str;
    if (str.length >= length) return str;

    const pad = padString.repeat(
      Math.ceil((length - str.length) / padString.length)
    );
    const padded = pad.slice(0, length - str.length);

    return padStart ? padded + str : str + padded;
  }

  /**
   * Pads a string to a specified length at the start
   * @param str String to pad
   * @param length Target length
   * @param padString String to pad with
   * @returns Padded string
   */
  static padStart(
    str: string,
    length: number,
    padString: string = " "
  ): string {
    return this.pad(str, length, padString, true);
  }

  /**
   * Pads a string to a specified length at the end
   * @param str String to pad
   * @param length Target length
   * @param padString String to pad with
   * @returns Padded string
   */
  static padEnd(str: string, length: number, padString: string = " "): string {
    return this.pad(str, length, padString, false);
  }

  /**
   * Repeats a string a specified number of times
   * @param str String to repeat
   * @param count Number of times to repeat
   * @returns Repeated string
   */
  static repeat(str: string, count: number): string {
    if (!str || count <= 0) return "";
    return str.repeat(count);
  }

  /**
   * Reverses a string
   * @param str String to reverse
   * @returns Reversed string
   */
  static reverse(str: string): string {
    if (!str) return str;
    return str.split("").reverse().join("");
  }

  /**
   * Counts the number of occurrences of a substring
   * @param str String to search in
   * @param substring Substring to count
   * @returns Number of occurrences
   */
  static count(str: string, substring: string): number {
    if (!str || !substring) return 0;
    return (str.match(new RegExp(substring, "g")) || []).length;
  }

  /**
   * Checks if a string starts with a substring
   * @param str String to check
   * @param substring Substring to check for
   * @returns True if string starts with substring
   */
  static startsWith(str: string, substring: string): boolean {
    if (!str || !substring) return false;
    return str.startsWith(substring);
  }

  /**
   * Checks if a string ends with a substring
   * @param str String to check
   * @param substring Substring to check for
   * @returns True if string ends with substring
   */
  static endsWith(str: string, substring: string): boolean {
    if (!str || !substring) return false;
    return str.endsWith(substring);
  }

  /**
   * Checks if a string contains a substring
   * @param str String to check
   * @param substring Substring to check for
   * @returns True if string contains substring
   */
  static contains(str: string, substring: string): boolean {
    if (!str || !substring) return false;
    return str.includes(substring);
  }

  /**
   * Replaces all occurrences of a substring
   * @param str String to replace in
   * @param search Substring to replace
   * @param replacement Replacement string
   * @returns String with replacements
   */
  static replaceAll(str: string, search: string, replacement: string): string {
    if (!str || !search) return str;
    return str.split(search).join(replacement);
  }

  /**
   * Removes all occurrences of a substring
   * @param str String to remove from
   * @param substring Substring to remove
   * @returns String with substring removed
   */
  static remove(str: string, substring: string): string {
    return this.replaceAll(str, substring, "");
  }

  /**
   * Removes leading and trailing characters
   * @param str String to trim
   * @param chars Characters to remove
   * @returns Trimmed string
   */
  static trim(str: string, chars: string = " \t\n\r\v\f"): string {
    if (!str) return str;
    return str.replace(new RegExp(`^[${chars}]+|[${chars}]+$`, "g"), "");
  }

  /**
   * Removes leading characters
   * @param str String to trim
   * @param chars Characters to remove
   * @returns Trimmed string
   */
  static trimStart(str: string, chars: string = " \t\n\r\v\f"): string {
    if (!str) return str;
    return str.replace(new RegExp(`^[${chars}]+`, "g"), "");
  }

  /**
   * Removes trailing characters
   * @param str String to trim
   * @param chars Characters to remove
   * @returns Trimmed string
   */
  static trimEnd(str: string, chars: string = " \t\n\r\v\f"): string {
    if (!str) return str;
    return str.replace(new RegExp(`[${chars}]+$`, "g"), "");
  }
}
