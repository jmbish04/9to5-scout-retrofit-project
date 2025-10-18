/**
 * @fileoverview Validation Helper Utilities
 *
 * Utility functions for data validation, sanitization, and transformation
 * across all domains in the 9to5 Scout platform.
 *
 * @author 9to5 Scout AI Team
 * @version 1.0.0
 * @since 2024-01-01
 */

import { z } from "zod";

/**
 * Common validation patterns
 */
export const ValidationPatterns = {
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  URL: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
  PHONE: /^\+?[\d\s\-\(\)]+$/,
  SLUG: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  ALPHANUMERIC: /^[a-zA-Z0-9]+$/,
  ALPHANUMERIC_WITH_SPACES: /^[a-zA-Z0-9\s]+$/,
  ALPHANUMERIC_WITH_HYPHENS: /^[a-zA-Z0-9\-]+$/,
} as const;

/**
 * Common validation schemas
 */
export const CommonSchemas = {
  UUID: z.string().uuid("Invalid UUID format"),
  EMAIL: z.string().email("Invalid email format"),
  URL: z.string().url("Invalid URL format"),
  PHONE: z.string().regex(ValidationPatterns.PHONE, "Invalid phone number format"),
  SLUG: z.string().regex(ValidationPatterns.SLUG, "Invalid slug format"),
  ALPHANUMERIC: z.string().regex(ValidationPatterns.ALPHANUMERIC, "Must contain only alphanumeric characters"),
  ALPHANUMERIC_WITH_SPACES: z.string().regex(ValidationPatterns.ALPHANUMERIC_WITH_SPACES, "Must contain only alphanumeric characters and spaces"),
  ALPHANUMERIC_WITH_HYPHENS: z.string().regex(ValidationPatterns.ALPHANUMERIC_WITH_HYPHENS, "Must contain only alphanumeric characters and hyphens"),
  POSITIVE_INT: z.number().int().positive("Must be a positive integer"),
  NON_NEGATIVE_INT: z.number().int().min(0, "Must be a non-negative integer"),
  POSITIVE_FLOAT: z.number().positive("Must be a positive number"),
  NON_NEGATIVE_FLOAT: z.number().min(0, "Must be a non-negative number"),
  DATE_STRING: z.string().datetime("Invalid date format"),
  BOOLEAN: z.boolean(),
  OPTIONAL_STRING: z.string().optional(),
  OPTIONAL_NUMBER: z.number().optional(),
  OPTIONAL_BOOLEAN: z.boolean().optional(),
} as const;

/**
 * Pagination validation schema
 */
export const PaginationSchema = z.object({
  page: CommonSchemas.POSITIVE_INT.default(1),
  limit: z.number().int().min(1).max(100).default(10),
  sort: z.string().optional(),
  order: z.enum(["asc", "desc"]).default("desc"),
});

/**
 * Search validation schema
 */
export const SearchSchema = z.object({
  q: z.string().min(1, "Search query is required"),
  filters: z.record(z.string(), z.any()).optional(),
  ...PaginationSchema.shape,
});

/**
 * Validates data against a Zod schema
 * @param schema Zod schema to validate against
 * @param data Data to validate
 * @returns Validation result with success flag and data/errors
 */
export function validateData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): {
  success: boolean;
  data?: T;
  errors?: Record<string, string[]>;
} {
  try {
    const validatedData = schema.parse(data);
    return {
      success: true,
      data: validatedData,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string[]> = {};
      
      error.errors.forEach((err) => {
        const path = err.path.join(".");
        if (!errors[path]) {
          errors[path] = [];
        }
        errors[path].push(err.message);
      });
      
      return {
        success: false,
        errors,
      };
    }
    
    return {
      success: false,
      errors: { general: ["Validation failed"] },
    };
  }
}

/**
 * Safely parses data with a Zod schema
 * @param schema Zod schema to parse with
 * @param data Data to parse
 * @returns Parsed data or null if validation fails
 */
export function safeParse<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): T | null {
  try {
    return schema.parse(data);
  } catch {
    return null;
  }
}

/**
 * Sanitizes string input by removing dangerous characters
 * @param input String to sanitize
 * @param options Sanitization options
 * @returns Sanitized string
 */
export function sanitizeString(
  input: string,
  options: {
    maxLength?: number;
    allowHtml?: boolean;
    allowSpecialChars?: boolean;
    trim?: boolean;
  } = {}
): string {
  let sanitized = input;
  
  if (options.trim !== false) {
    sanitized = sanitized.trim();
  }
  
  if (options.maxLength) {
    sanitized = sanitized.substring(0, options.maxLength);
  }
  
  if (!options.allowHtml) {
    // Remove HTML tags
    sanitized = sanitized.replace(/<[^>]*>/g, "");
  }
  
  if (!options.allowSpecialChars) {
    // Remove special characters except basic punctuation
    sanitized = sanitized.replace(/[^\w\s\-.,!?]/g, "");
  }
  
  return sanitized;
}

/**
 * Validates and sanitizes email address
 * @param email Email to validate and sanitize
 * @returns Sanitized email or null if invalid
 */
export function validateAndSanitizeEmail(email: string): string | null {
  const sanitized = sanitizeString(email.trim().toLowerCase(), {
    maxLength: 254, // RFC 5321 limit
    allowSpecialChars: false,
  });
  
  if (CommonSchemas.EMAIL.safeParse(sanitized).success) {
    return sanitized;
  }
  
  return null;
}

/**
 * Validates and sanitizes URL
 * @param url URL to validate and sanitize
 * @returns Sanitized URL or null if invalid
 */
export function validateAndSanitizeUrl(url: string): string | null {
  const sanitized = sanitizeString(url.trim(), {
    allowSpecialChars: true,
  });
  
  if (CommonSchemas.URL.safeParse(sanitized).success) {
    return sanitized;
  }
  
  return null;
}

/**
 * Validates and sanitizes phone number
 * @param phone Phone number to validate and sanitize
 * @returns Sanitized phone number or null if invalid
 */
export function validateAndSanitizePhone(phone: string): string | null {
  const sanitized = sanitizeString(phone.trim(), {
    allowSpecialChars: true,
  });
  
  if (CommonSchemas.PHONE.safeParse(sanitized).success) {
    return sanitized;
  }
  
  return null;
}

/**
 * Validates pagination parameters
 * @param params Pagination parameters
 * @returns Validated pagination parameters
 */
export function validatePagination(params: {
  page?: number;
  limit?: number;
  sort?: string;
  order?: "asc" | "desc";
}): {
  page: number;
  limit: number;
  sort?: string;
  order: "asc" | "desc";
} {
  const result = PaginationSchema.parse(params);
  return result;
}

/**
 * Validates search parameters
 * @param params Search parameters
 * @returns Validated search parameters
 */
export function validateSearch(params: {
  q?: string;
  filters?: Record<string, any>;
  page?: number;
  limit?: number;
  sort?: string;
  order?: "asc" | "desc";
}): {
  q: string;
  filters?: Record<string, any>;
  page: number;
  limit: number;
  sort?: string;
  order: "asc" | "desc";
} {
  const result = SearchSchema.parse(params);
  return result;
}

/**
 * Validates UUID
 * @param uuid UUID to validate
 * @returns True if valid UUID
 */
export function isValidUUID(uuid: string): boolean {
  return CommonSchemas.UUID.safeParse(uuid).success;
}

/**
 * Validates email
 * @param email Email to validate
 * @returns True if valid email
 */
export function isValidEmail(email: string): boolean {
  return CommonSchemas.EMAIL.safeParse(email).success;
}

/**
 * Validates URL
 * @param url URL to validate
 * @returns True if valid URL
 */
export function isValidUrl(url: string): boolean {
  return CommonSchemas.URL.safeParse(url).success;
}

/**
 * Validates phone number
 * @param phone Phone number to validate
 * @returns True if valid phone number
 */
export function isValidPhone(phone: string): boolean {
  return CommonSchemas.PHONE.safeParse(phone).success;
}

/**
 * Validates slug
 * @param slug Slug to validate
 * @returns True if valid slug
 */
export function isValidSlug(slug: string): boolean {
  return CommonSchemas.SLUG.safeParse(slug).success;
}

/**
 * Converts string to slug
 * @param input String to convert to slug
 * @returns Slug string
 */
export function stringToSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/[\s_-]+/g, "-") // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
}

/**
 * Validates date string
 * @param dateString Date string to validate
 * @returns True if valid date string
 */
export function isValidDateString(dateString: string): boolean {
  return CommonSchemas.DATE_STRING.safeParse(dateString).success;
}

/**
 * Validates boolean
 * @param value Value to validate as boolean
 * @returns True if valid boolean
 */
export function isValidBoolean(value: any): boolean {
  return CommonSchemas.BOOLEAN.safeParse(value).success;
}

/**
 * Converts value to boolean
 * @param value Value to convert
 * @param defaultValue Default value if conversion fails
 * @returns Boolean value
 */
export function toBoolean(value: any, defaultValue: boolean = false): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  
  if (typeof value === "string") {
    const lower = value.toLowerCase();
    if (lower === "true" || lower === "1" || lower === "yes") {
      return true;
    }
    if (lower === "false" || lower === "0" || lower === "no") {
      return false;
    }
  }
  
  if (typeof value === "number") {
    return value !== 0;
  }
  
  return defaultValue;
}

/**
 * Validates array of items
 * @param items Array to validate
 * @param itemSchema Schema for each item
 * @param options Validation options
 * @returns Validation result
 */
export function validateArray<T>(
  items: unknown[],
  itemSchema: z.ZodSchema<T>,
  options: {
    minLength?: number;
    maxLength?: number;
    unique?: boolean;
  } = {}
): {
  success: boolean;
  data?: T[];
  errors?: Record<string, string[]>;
} {
  const errors: Record<string, string[]> = {};
  
  // Check array length
  if (options.minLength && items.length < options.minLength) {
    errors.array = [`Array must have at least ${options.minLength} items`];
  }
  
  if (options.maxLength && items.length > options.maxLength) {
    errors.array = [`Array must have at most ${options.maxLength} items`];
  }
  
  // Validate each item
  const validatedItems: T[] = [];
  items.forEach((item, index) => {
    const result = validateData(itemSchema, item);
    if (!result.success) {
      errors[`item_${index}`] = result.errors?.["general"] || ["Invalid item"];
    } else {
      validatedItems.push(result.data!);
    }
  });
  
  // Check uniqueness if required
  if (options.unique && validatedItems.length > 0) {
    const uniqueItems = new Set(validatedItems.map(item => JSON.stringify(item)));
    if (uniqueItems.size !== validatedItems.length) {
      errors.array = errors.array || [];
      errors.array.push("Array items must be unique");
    }
  }
  
  if (Object.keys(errors).length > 0) {
    return {
      success: false,
      errors,
    };
  }
  
  return {
    success: true,
    data: validatedItems,
  };
}