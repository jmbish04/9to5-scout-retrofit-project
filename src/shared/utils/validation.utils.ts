/**
 * @fileoverview Validation Utility Functions
 *
 * Utility functions for data validation, sanitization, and type checking
 * across all domains in the 9to5 Scout platform.
 *
 * @author 9to5 Scout AI Team
 * @version 1.0.0
 * @since 2024-01-01
 */

import { z } from "zod";
import { ValidationError } from "./error.utils";

/**
 * Validation utility functions
 */
export class ValidationUtils {
  /**
   * Validates data against a Zod schema
   */
  static validateSchema<T>(schema: z.ZodSchema<T>, data: unknown): T {
    try {
      return schema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationErrors = error.issues.map((err) => ({
          field: err.path.join("."),
          message: err.message,
          value: err.input,
          code: err.code,
        }));

        throw new ValidationError("Validation failed", {
          validation_errors: validationErrors,
        });
      }

      throw error;
    }
  }

  /**
   * Safely validates data against a Zod schema
   */
  static safeValidateSchema<T>(
    schema: z.ZodSchema<T>,
    data: unknown
  ): { success: true; data: T } | { success: false; error: ValidationError } {
    try {
      const result = schema.parse(data);
      return { success: true, data: result };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationErrors = error.issues.map((err) => ({
          field: err.path.join("."),
          message: err.message,
          value: err.input,
          code: err.code,
        }));

        return {
          success: false,
          error: new ValidationError("Validation failed", {
            validation_errors: validationErrors,
          }),
        };
      }

      return {
        success: false,
        error: new ValidationError("Validation failed", {
          original_error:
            error instanceof Error ? error.message : String(error),
        }),
      };
    }
  }

  /**
   * Validates email format
   */
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validates URL format
   */
  static validateUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validates UUID format
   */
  static validateUuid(uuid: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Validates phone number format
   */
  static validatePhone(phone: string): boolean {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ""));
  }

  /**
   * Validates password strength
   */
  static validatePasswordStrength(password: string): {
    isValid: boolean;
    score: number;
    feedback: string[];
  } {
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

  /**
   * Validates JSON string
   */
  static validateJson(jsonString: string): boolean {
    try {
      JSON.parse(jsonString);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validates base64 string
   */
  static validateBase64(base64String: string): boolean {
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    return base64Regex.test(base64String) && base64String.length % 4 === 0;
  }

  /**
   * Validates credit card number using Luhn algorithm
   */
  static validateCreditCard(cardNumber: string): boolean {
    // Remove spaces and dashes
    const cleaned = cardNumber.replace(/[\s\-]/g, "");

    // Check if it's all digits and proper length
    if (!/^\d{13,19}$/.test(cleaned)) return false;

    // Luhn algorithm
    let sum = 0;
    let isEven = false;

    for (let i = cleaned.length - 1; i >= 0; i--) {
      const char = cleaned[i];
      if (!char) continue;
      let digit = parseInt(char, 10);

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
   * Validates IP address
   */
  static validateIpAddress(ip: string): boolean {
    const ipv4Regex =
      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;

    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
  }

  /**
   * Validates date string
   */
  static validateDate(dateString: string): boolean {
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  }

  /**
   * Validates date range
   */
  static validateDateRange(startDate: string, endDate: string): boolean {
    if (!this.validateDate(startDate) || !this.validateDate(endDate)) {
      return false;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    return start <= end;
  }

  /**
   * Validates numeric range
   */
  static validateNumericRange(
    value: number,
    min: number,
    max: number
  ): boolean {
    return value >= min && value <= max;
  }

  /**
   * Validates string length
   */
  static validateStringLength(str: string, min: number, max: number): boolean {
    return str.length >= min && str.length <= max;
  }

  /**
   * Validates array length
   */
  static validateArrayLength<T>(arr: T[], min: number, max: number): boolean {
    return arr.length >= min && arr.length <= max;
  }

  /**
   * Validates required fields
   */
  static validateRequiredFields(
    data: Record<string, unknown>,
    requiredFields: string[]
  ): { isValid: boolean; missingFields: string[] } {
    const missingFields = requiredFields.filter((field) => {
      const value = data[field];
      return value === undefined || value === null || value === "";
    });

    return {
      isValid: missingFields.length === 0,
      missingFields,
    };
  }

  /**
   * Validates enum value
   */
  static validateEnum<T>(value: unknown, enumValues: T[]): value is T {
    return enumValues.includes(value as T);
  }

  /**
   * Validates regex pattern
   */
  static validatePattern(str: string, pattern: RegExp): boolean {
    return pattern.test(str);
  }

  /**
   * Sanitizes string input
   */
  static sanitizeString(str: string): string {
    return str.trim().replace(/\s+/g, " ").replace(/[<>]/g, "");
  }

  /**
   * Sanitizes HTML content
   */
  static sanitizeHtml(html: string): string {
    return html.replace(/<[^>]*>/g, "");
  }

  /**
   * Sanitizes SQL input
   */
  static sanitizeSql(input: string): string {
    return input.replace(/['"\\]/g, "");
  }

  /**
   * Sanitizes file name
   */
  static sanitizeFileName(fileName: string): string {
    return fileName
      .replace(/[^a-zA-Z0-9.-]/g, "_")
      .replace(/_{2,}/g, "_")
      .replace(/^_|_$/g, "");
  }

  /**
   * Sanitizes URL
   */
  static sanitizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.toString();
    } catch {
      return "";
    }
  }

  /**
   * Normalizes email address
   */
  static normalizeEmail(email: string): string {
    return email.toLowerCase().trim();
  }

  /**
   * Normalizes phone number
   */
  static normalizePhone(phone: string): string {
    return phone.replace(/[\s\-\(\)]/g, "");
  }

  /**
   * Normalizes string
   */
  static normalizeString(str: string): string {
    return str.trim().replace(/\s+/g, " ").toLowerCase();
  }

  /**
   * Validates and sanitizes input
   */
  static validateAndSanitize<T>(
    schema: z.ZodSchema<T>,
    data: unknown
  ): { success: true; data: T } | { success: false; error: ValidationError } {
    const validationResult = this.safeValidateSchema(schema, data);

    if (!validationResult.success) {
      return validationResult;
    }

    // Apply sanitization if needed
    const sanitizedData = this.sanitizeObject(data as Record<string, unknown>);

    return this.safeValidateSchema(schema, sanitizedData);
  }

  /**
   * Sanitizes object properties
   */
  static sanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === "string") {
        sanitized[key] = this.sanitizeString(value);
      } else if (typeof value === "object" && value !== null) {
        if (Array.isArray(value)) {
          sanitized[key] = value.map((item) =>
            typeof item === "string" ? this.sanitizeString(item) : item
          );
        } else {
          sanitized[key] = this.sanitizeObject(
            value as Record<string, unknown>
          );
        }
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Creates a validation schema for common patterns
   */
  static createCommonSchemas() {
    return {
      email: z.string().email("Invalid email format"),
      url: z.string().url("Invalid URL format"),
      uuid: z.string().uuid("Invalid UUID format"),
      phone: z
        .string()
        .regex(/^[\+]?[1-9][\d]{0,15}$/, "Invalid phone number format"),
      password: z.string().min(8, "Password must be at least 8 characters"),
      date: z.string().datetime("Invalid date format"),
      positiveNumber: z.number().positive("Must be a positive number"),
      nonNegativeNumber: z.number().min(0, "Must be a non-negative number"),
      stringLength: (min: number, max: number) =>
        z
          .string()
          .min(min, `Must be at least ${min} characters`)
          .max(max, `Must be at most ${max} characters`),
      arrayLength: (min: number, max: number) =>
        z
          .array(z.any())
          .min(min, `Must have at least ${min} items`)
          .max(max, `Must have at most ${max} items`),
    };
  }
}
