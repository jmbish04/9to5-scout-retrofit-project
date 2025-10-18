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

/**
 * Formats a number as currency
 * @param amount Amount to format
 * @param currency Currency code (default: USD)
 * @param locale Locale for formatting (default: en-US)
 * @returns Formatted currency string
 */
export function formatCurrency(
  amount: number,
  currency: string = "USD",
  locale: string = "en-US"
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
 * Formats a number with thousand separators
 * @param number Number to format
 * @param locale Locale for formatting (default: en-US)
 * @returns Formatted number string
 */
export function formatNumber(number: number, locale: string = "en-US"): string {
  try {
    return new Intl.NumberFormat(locale).format(number);
  } catch {
    return number.toString();
  }
}

/**
 * Formats a percentage
 * @param value Value to format as percentage
 * @param decimals Number of decimal places (default: 1)
 * @param locale Locale for formatting (default: en-US)
 * @returns Formatted percentage string
 */
export function formatPercentage(
  value: number,
  decimals: number = 1,
  locale: string = "en-US"
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
 * @param date Date to format
 * @param options Formatting options
 * @returns Formatted date string
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
    locale = "en-US",
    format = "medium",
    includeTime = false,
    timeZone = "UTC",
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
 * Formats a relative time (e.g., "2 hours ago")
 * @param date Date to format
 * @param locale Locale for formatting (default: en-US)
 * @returns Formatted relative time string
 */
export function formatRelativeTime(
  date: Date | string,
  locale: string = "en-US"
): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) {
    return "Invalid Date";
  }

  try {
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
    const now = new Date();
    const diffInSeconds = Math.floor(
      (dateObj.getTime() - now.getTime()) / 1000
    );

    const units: Array<{ unit: Intl.RelativeTimeFormatUnit; seconds: number }> =
      [
        { unit: "year", seconds: 31536000 },
        { unit: "month", seconds: 2592000 },
        { unit: "day", seconds: 86400 },
        { unit: "hour", seconds: 3600 },
        { unit: "minute", seconds: 60 },
        { unit: "second", seconds: 1 },
      ];

    for (const { unit, seconds } of units) {
      const value = Math.floor(diffInSeconds / seconds);
      if (Math.abs(value) >= 1) {
        return rtf.format(value, unit);
      }
    }

    return rtf.format(0, "second");
  } catch {
    return dateObj.toLocaleDateString();
  }
}

/**
 * Formats file size in human-readable format
 * @param bytes File size in bytes
 * @param decimals Number of decimal places (default: 2)
 * @returns Formatted file size string
 */
export function formatFileSize(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

/**
 * Formats duration in human-readable format
 * @param milliseconds Duration in milliseconds
 * @param options Formatting options
 * @returns Formatted duration string
 */
export function formatDuration(
  milliseconds: number,
  options: {
    includeMilliseconds?: boolean;
    compact?: boolean;
  } = {}
): string {
  const { includeMilliseconds = false, compact = false } = options;

  const units = [
    { name: "day", short: "d", value: 24 * 60 * 60 * 1000 },
    { name: "hour", short: "h", value: 60 * 60 * 1000 },
    { name: "minute", short: "m", value: 60 * 1000 },
    { name: "second", short: "s", value: 1000 },
    { name: "millisecond", short: "ms", value: 1 },
  ];

  const parts: string[] = [];
  let remaining = milliseconds;

  for (const unit of units) {
    if (unit.name === "millisecond" && !includeMilliseconds) {
      break;
    }

    const value = Math.floor(remaining / unit.value);
    if (value > 0) {
      const unitName = compact
        ? unit.short
        : ` ${unit.name}${value === 1 ? "" : "s"}`;
      parts.push(`${value}${unitName}`);
      remaining -= value * unit.value;
    }
  }

  if (parts.length === 0) {
    return compact ? "0ms" : "0 milliseconds";
  }

  return parts.join(compact ? " " : ", ");
}

/**
 * Formats a phone number
 * @param phone Phone number to format
 * @param format Format style (default: US)
 * @returns Formatted phone number string
 */
export function formatPhone(
  phone: string,
  format: "US" | "international" | "e164" = "US"
): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, "");

  if (digits.length === 0) {
    return phone;
  }

  switch (format) {
    case "US":
      if (digits.length === 10) {
        return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(
          6
        )}`;
      } else if (digits.length === 11 && digits[0] === "1") {
        return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(
          7
        )}`;
      }
      break;

    case "international":
      if (digits.length >= 10) {
        return `+${digits}`;
      }
      break;

    case "e164":
      if (digits.length >= 10) {
        return `+${digits}`;
      }
      break;
  }

  return phone;
}

/**
 * Formats a name (capitalizes first letter of each word)
 * @param name Name to format
 * @returns Formatted name string
 */
export function formatName(name: string): string {
  return name
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Formats initials from a name
 * @param name Name to extract initials from
 * @param maxInitials Maximum number of initials (default: 2)
 * @returns Formatted initials string
 */
export function formatInitials(name: string, maxInitials: number = 2): string {
  return name
    .split(" ")
    .filter((word) => word.length > 0)
    .slice(0, maxInitials)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

/**
 * Truncates text to specified length
 * @param text Text to truncate
 * @param maxLength Maximum length
 * @param suffix Suffix to add when truncating (default: "...")
 * @returns Truncated text string
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
 * Formats a list of items as a readable string
 * @param items Array of items
 * @param options Formatting options
 * @returns Formatted list string
 */
export function formatList(
  items: string[],
  options: {
    conjunction?: "and" | "or";
    maxItems?: number;
    emptyText?: string;
  } = {}
): string {
  const { conjunction = "and", maxItems, emptyText = "None" } = options;

  if (items.length === 0) {
    return emptyText;
  }

  let displayItems = items;
  if (maxItems && items.length > maxItems) {
    displayItems = items.slice(0, maxItems);
  }

  if (displayItems.length === 1) {
    return displayItems[0] || "";
  }

  if (displayItems.length === 2) {
    return `${displayItems[0] || ""} ${conjunction} ${displayItems[1] || ""}`;
  }

  const lastItem = displayItems[displayItems.length - 1] || "";
  const otherItems = displayItems.slice(0, -1);

  let result = otherItems.join(", ");
  if (maxItems && items.length > maxItems) {
    result += `, and ${items.length - maxItems + 1} more`;
  } else {
    result += `, ${conjunction} ${lastItem}`;
  }

  return result;
}

/**
 * Formats a score or rating
 * @param score Score to format
 * @param maxScore Maximum possible score (default: 100)
 * @param options Formatting options
 * @returns Formatted score string
 */
export function formatScore(
  score: number,
  maxScore: number = 100,
  options: {
    showPercentage?: boolean;
    showFraction?: boolean;
    decimals?: number;
  } = {}
): string {
  const {
    showPercentage = false,
    showFraction = false,
    decimals = 1,
  } = options;

  if (showFraction) {
    return `${score}/${maxScore}`;
  }

  if (showPercentage) {
    const percentage = (score / maxScore) * 100;
    return `${percentage.toFixed(decimals)}%`;
  }

  return score.toFixed(decimals);
}

/**
 * Formats a progress bar
 * @param current Current value
 * @param total Total value
 * @param options Formatting options
 * @returns Formatted progress bar string
 */
export function formatProgressBar(
  current: number,
  total: number,
  options: {
    width?: number;
    filledChar?: string;
    emptyChar?: string;
    showPercentage?: boolean;
  } = {}
): string {
  const {
    width = 20,
    filledChar = "█",
    emptyChar = "░",
    showPercentage = true,
  } = options;

  const percentage = Math.min(100, Math.max(0, (current / total) * 100));
  const filledWidth = Math.round((percentage / 100) * width);
  const emptyWidth = width - filledWidth;

  let bar = filledChar.repeat(filledWidth) + emptyChar.repeat(emptyWidth);

  if (showPercentage) {
    bar += ` ${percentage.toFixed(1)}%`;
  }

  return bar;
}

/**
 * Formats a JSON object for display
 * @param obj Object to format
 * @param options Formatting options
 * @returns Formatted JSON string
 */
export function formatJSON(
  obj: any,
  options: {
    indent?: number;
    maxDepth?: number;
    maxLength?: number;
  } = {}
): string {
  const { indent = 2, maxDepth = 10, maxLength = 1000 } = options;

  try {
    let json = JSON.stringify(obj, null, indent);

    if (maxLength && json.length > maxLength) {
      json = json.substring(0, maxLength) + "...";
    }

    return json;
  } catch {
    return String(obj);
  }
}

/**
 * Formats a URL for display
 * @param url URL to format
 * @param options Formatting options
 * @returns Formatted URL string
 */
export function formatURL(
  url: string,
  options: {
    maxLength?: number;
    showProtocol?: boolean;
  } = {}
): string {
  const { maxLength = 50, showProtocol = true } = options;

  let formatted = url;

  if (!showProtocol) {
    formatted = formatted.replace(/^https?:\/\//, "");
  }

  if (maxLength && formatted.length > maxLength) {
    formatted = formatted.substring(0, maxLength - 3) + "...";
  }

  return formatted;
}
