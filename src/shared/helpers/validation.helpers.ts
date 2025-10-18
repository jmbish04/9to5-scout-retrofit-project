/**
 * @fileoverview Validation Helper Utilities
 *
 * Utility functions for data validation, sanitization, and type checking
 * across all domains in the 9to5 Scout platform.
 *
 * @author 9to5 Scout AI Team
 * @version 1.0.0
 * @since 2024-01-01
 */

/**
 * Validation utility functions
 */
export class ValidationUtils {
  /**
   * Checks if a value is null or undefined
   */
  static isNullish(value: unknown): value is null | undefined {
    return value === null || value === undefined;
  }

  /**
   * Checks if a value is not null or undefined
   */
  static isNotNullish<T>(value: T | null | undefined): value is T {
    return value !== null && value !== undefined;
  }

  /**
   * Checks if a value is a string
   */
  static isString(value: unknown): value is string {
    return typeof value === "string";
  }

  /**
   * Checks if a value is a number
   */
  static isNumber(value: unknown): value is number {
    return typeof value === "number" && !isNaN(value);
  }

  /**
   * Checks if a value is a boolean
   */
  static isBoolean(value: unknown): value is boolean {
    return typeof value === "boolean";
  }

  /**
   * Checks if a value is an array
   */
  static isArray<T>(value: unknown): value is T[] {
    return Array.isArray(value);
  }

  /**
   * Checks if a value is an object (but not array or null)
   */
  static isObject(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  /**
   * Checks if a value is a function
   */
  static isFunction(value: unknown): value is Function {
    return typeof value === "function";
  }

  /**
   * Checks if a value is a Date object
   */
  static isDate(value: unknown): value is Date {
    return value instanceof Date && !isNaN(value.getTime());
  }

  /**
   * Checks if a value is a RegExp
   */
  static isRegExp(value: unknown): value is RegExp {
    return value instanceof RegExp;
  }

  /**
   * Checks if a value is a Promise
   */
  static isPromise(value: unknown): value is Promise<unknown> {
    return value instanceof Promise;
  }

  /**
   * Checks if a value is a valid email
   */
  static isValidEmail(value: string): boolean {
    if (!this.isString(value)) return false;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  }

  /**
   * Checks if a value is a valid URL
   */
  static isValidUrl(value: string): boolean {
    if (!this.isString(value)) return false;

    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Checks if a value is a valid UUID
   */
  static isValidUuid(value: string): boolean {
    if (!this.isString(value)) return false;

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
  }

  /**
   * Checks if a value is a valid phone number
   */
  static isValidPhone(value: string): boolean {
    if (!this.isString(value)) return false;

    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(value.replace(/[\s\-\(\)]/g, ""));
  }

  /**
   * Checks if a value is a valid IP address
   */
  static isValidIp(value: string): boolean {
    if (!this.isString(value)) return false;

    const ipv4Regex =
      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;

    return ipv4Regex.test(value) || ipv6Regex.test(value);
  }

  /**
   * Checks if a value is a valid JSON string
   */
  static isValidJson(value: string): boolean {
    if (!this.isString(value)) return false;

    try {
      JSON.parse(value);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Checks if a value is a valid base64 string
   */
  static isValidBase64(value: string): boolean {
    if (!this.isString(value)) return false;

    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    return base64Regex.test(value) && value.length % 4 === 0;
  }

  /**
   * Checks if a value is a valid credit card number
   */
  static isValidCreditCard(value: string): boolean {
    if (!this.isString(value)) return false;

    // Remove spaces and dashes
    const cleaned = value.replace(/[\s\-]/g, "");

    // Check if it's all digits and proper length
    if (!/^\d{13,19}$/.test(cleaned)) return false;

    // Luhn algorithm
    let sum = 0;
    let isEven = false;

    for (let i = cleaned.length - 1; i >= 0; i--) {
      let digit = parseInt(cleaned[i], 10);

      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }

      sum += digit;
      isEven = !isEven;
    }

    return sum % 10 === 0;
  }

  /**
   * Checks if a value is within a numeric range
   */
  static isInRange(value: number, min: number, max: number): boolean {
    if (!this.isNumber(value)) return false;

    return value >= min && value <= max;
  }

  /**
   * Checks if a string length is within range
   */
  static isLengthInRange(value: string, min: number, max: number): boolean {
    if (!this.isString(value)) return false;

    return value.length >= min && value.length <= max;
  }

  /**
   * Checks if an array length is within range
   */
  static isArrayLengthInRange<T>(
    value: T[],
    min: number,
    max: number
  ): boolean {
    if (!this.isArray(value)) return false;

    return value.length >= min && value.length <= max;
  }

  /**
   * Checks if a value is one of the allowed values
   */
  static isOneOf<T>(value: unknown, allowedValues: T[]): value is T {
    return allowedValues.includes(value as T);
  }

  /**
   * Checks if a value matches a regular expression
   */
  static matches(value: string, regex: RegExp): boolean {
    if (!this.isString(value)) return false;

    return regex.test(value);
  }

  /**
   * Checks if a value contains only alphanumeric characters
   */
  static isAlphanumeric(value: string): boolean {
    if (!this.isString(value)) return false;

    return /^[a-zA-Z0-9]+$/.test(value);
  }

  /**
   * Checks if a value contains only alphabetic characters
   */
  static isAlpha(value: string): boolean {
    if (!this.isString(value)) return false;

    return /^[a-zA-Z]+$/.test(value);
  }

  /**
   * Checks if a value contains only numeric characters
   */
  static isNumeric(value: string): boolean {
    if (!this.isString(value)) return false;

    return /^[0-9]+$/.test(value);
  }

  /**
   * Checks if a value is a positive number
   */
  static isPositive(value: number): boolean {
    return this.isNumber(value) && value > 0;
  }

  /**
   * Checks if a value is a negative number
   */
  static isNegative(value: number): boolean {
    return this.isNumber(value) && value < 0;
  }

  /**
   * Checks if a value is an integer
   */
  static isInteger(value: number): boolean {
    return this.isNumber(value) && Number.isInteger(value);
  }

  /**
   * Checks if a value is a float
   */
  static isFloat(value: number): boolean {
    return this.isNumber(value) && !Number.isInteger(value);
  }

  /**
   * Checks if a value is a finite number
   */
  static isFinite(value: number): boolean {
    return this.isNumber(value) && Number.isFinite(value);
  }

  /**
   * Checks if a value is a safe integer
   */
  static isSafeInteger(value: number): boolean {
    return this.isNumber(value) && Number.isSafeInteger(value);
  }

  /**
   * Sanitizes a string by removing HTML tags
   */
  static sanitizeHtml(value: string): string {
    if (!this.isString(value)) return "";

    return value.replace(/<[^>]*>/g, "");
  }

  /**
   * Sanitizes a string by removing special characters
   */
  static sanitizeSpecialChars(value: string): string {
    if (!this.isString(value)) return "";

    return value.replace(/[^a-zA-Z0-9\s]/g, "");
  }

  /**
   * Sanitizes a string by trimming whitespace
   */
  static sanitizeWhitespace(value: string): string {
    if (!this.isString(value)) return "";

    return value.trim().replace(/\s+/g, " ");
  }

  /**
   * Sanitizes a string by removing control characters
   */
  static sanitizeControlChars(value: string): string {
    if (!this.isString(value)) return "";

    return value.replace(/[\x00-\x1F\x7F]/g, "");
  }

  /**
   * Validates a password strength
   */
  static validatePasswordStrength(password: string): {
    isValid: boolean;
    score: number;
    feedback: string[];
  } {
    if (!this.isString(password)) {
      return {
        isValid: false,
        score: 0,
        feedback: ["Password must be a string"],
      };
    }

    const feedback: string[] = [];
    let score = 0;

    // Length check
    if (password.length < 8) {
      feedback.push("Password must be at least 8 characters long");
    } else {
      score += 1;
    }

    // Uppercase check
    if (!/[A-Z]/.test(password)) {
      feedback.push("Password must contain at least one uppercase letter");
    } else {
      score += 1;
    }

    // Lowercase check
    if (!/[a-z]/.test(password)) {
      feedback.push("Password must contain at least one lowercase letter");
    } else {
      score += 1;
    }

    // Number check
    if (!/[0-9]/.test(password)) {
      feedback.push("Password must contain at least one number");
    } else {
      score += 1;
    }

    // Special character check
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      feedback.push("Password must contain at least one special character");
    } else {
      score += 1;
    }

    return {
      isValid: score >= 4,
      score,
      feedback,
    };
  }
}
