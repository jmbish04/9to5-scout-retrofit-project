/**
 * @fileoverview Formatting Helper Utilities
 *
 * Utility functions for data formatting, display, and presentation
 * across all domains in the 9to5 Scout platform.
 *
 * @author 9to5 Scout AI Team
 * @version 1.0.0
 * @since 2024-01-01
 */

import { FORMATTING_CONSTANTS } from "../constants";

/**
 * Formats a number with thousand separators
 */
export function formatNumber(
  number: number,
  locale: string = FORMATTING_CONSTANTS.DEFAULT_LOCALE
): string {
  try {
    return new Intl.NumberFormat(locale).format(number);
  } catch {
    return number.toString();
  }
}

/**
 * Formats a currency amount
 */
export function formatCurrency(
  amount: number,
  currency: string = FORMATTING_CONSTANTS.DEFAULT_CURRENCY,
  locale: string = FORMATTING_CONSTANTS.DEFAULT_LOCALE
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

/**
 * Formats a percentage
 */
export function formatPercentage(
  value: number,
  decimals: number = 1,
  locale: string = FORMATTING_CONSTANTS.DEFAULT_LOCALE
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "percent",
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value / 100);
  } catch {
    return `${value.toFixed(decimals)}%`;
  }
}

/**
 * Formats a date
 */
export function formatDate(
  date: Date | string,
  options: {
    locale?: string;
    format?: "short" | "medium" | "long" | "full";
    includeTime?: boolean;
    timeZone?: string;
  } = {}
): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) {
    return "Invalid Date";
  }

  const {
    locale = FORMATTING_CONSTANTS.DEFAULT_LOCALE,
    format = "medium",
    includeTime = false,
    timeZone = FORMATTING_CONSTANTS.DEFAULT_TIMEZONE,
  } = options;

  try {
    const formatOptions: Intl.DateTimeFormatOptions = {
      timeZone,
    };

    switch (format) {
      case "short":
        formatOptions.dateStyle = "short";
        break;
      case "medium":
        formatOptions.dateStyle = "medium";
        break;
      case "long":
        formatOptions.dateStyle = "long";
        break;
      case "full":
        formatOptions.dateStyle = "full";
        break;
    }

    if (includeTime) {
      formatOptions.timeStyle = "short";
    }

    return new Intl.DateTimeFormat(locale, formatOptions).format(dateObj);
  } catch {
    return dateObj.toLocaleDateString();
  }
}

/**
 * Truncates text to specified length
 */
export function truncateText(
  text: string,
  maxLength: number,
  suffix: string = "..."
): string {
  if (text.length <= maxLength) {
    return text;
  }

  return text.slice(0, maxLength - suffix.length) + suffix;
}

/**
 * Capitalizes the first letter of a string
 */
export function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Capitalizes the first letter of each word in a string
 */
export function capitalizeWords(str: string): string {
  if (!str) return str;
  return str
    .split(" ")
    .map((word) => capitalize(word))
    .join(" ");
}
