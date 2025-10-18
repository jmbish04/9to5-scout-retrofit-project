/**
 * @fileoverview Date Helper Utilities
 *
 * Utility functions for date manipulation, formatting, and validation
 * across all domains in the 9to5 Scout platform.
 *
 * @author 9to5 Scout AI Team
 * @version 1.0.0
 * @since 2024-01-01
 */

/**
 * Date utility functions
 */
export class DateUtils {
  /**
   * Checks if a value is a valid date
   */
  static isValidDate(value: unknown): value is Date {
    return value instanceof Date && !isNaN(value.getTime());
  }

  /**
   * Parses a date string or timestamp into a Date object
   */
  static parseDate(value: string | number | Date): Date | null {
    if (value instanceof Date) {
      return this.isValidDate(value) ? value : null;
    }

    if (typeof value === "number") {
      const date = new Date(value);
      return this.isValidDate(date) ? date : null;
    }

    if (typeof value === "string") {
      const date = new Date(value);
      return this.isValidDate(date) ? date : null;
    }

    return null;
  }

  /**
   * Formats a date to ISO string
   */
  static toISOString(date: Date): string {
    return this.isValidDate(date) ? date.toISOString() : "";
  }

  /**
   * Formats a date to a readable string
   */
  static format(
    date: Date,
    format: "short" | "medium" | "long" | "full" = "medium"
  ): string {
    if (!this.isValidDate(date)) return "";

    const options: Intl.DateTimeFormatOptions = {
      short: { year: "numeric", month: "short", day: "numeric" },
      medium: {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      },
      long: {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      },
      full: {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZoneName: "short",
      },
    };

    return date.toLocaleDateString("en-US", options[format]);
  }

  /**
   * Formats a date to relative time (e.g., "2 hours ago")
   */
  static formatRelative(date: Date, now = new Date()): string {
    if (!this.isValidDate(date)) return "";

    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);

    if (diffSeconds < 60) {
      return "just now";
    } else if (diffMinutes < 60) {
      return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
    } else if (diffWeeks < 4) {
      return `${diffWeeks} week${diffWeeks === 1 ? "" : "s"} ago`;
    } else if (diffMonths < 12) {
      return `${diffMonths} month${diffMonths === 1 ? "" : "s"} ago`;
    } else {
      return `${diffYears} year${diffYears === 1 ? "" : "s"} ago`;
    }
  }

  /**
   * Gets the start of day for a date
   */
  static startOfDay(date: Date): Date {
    if (!this.isValidDate(date)) return new Date();

    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  /**
   * Gets the end of day for a date
   */
  static endOfDay(date: Date): Date {
    if (!this.isValidDate(date)) return new Date();

    const result = new Date(date);
    result.setHours(23, 59, 59, 999);
    return result;
  }

  /**
   * Gets the start of week for a date
   */
  static startOfWeek(date: Date, firstDayOfWeek = 0): Date {
    if (!this.isValidDate(date)) return new Date();

    const result = new Date(date);
    const day = result.getDay();
    const diff = day - firstDayOfWeek;
    result.setDate(result.getDate() - diff);
    return this.startOfDay(result);
  }

  /**
   * Gets the end of week for a date
   */
  static endOfWeek(date: Date, firstDayOfWeek = 0): Date {
    if (!this.isValidDate(date)) return new Date();

    const result = new Date(date);
    const day = result.getDay();
    const diff = day - firstDayOfWeek + 6;
    result.setDate(result.getDate() - diff + 6);
    return this.endOfDay(result);
  }

  /**
   * Gets the start of month for a date
   */
  static startOfMonth(date: Date): Date {
    if (!this.isValidDate(date)) return new Date();

    const result = new Date(date);
    result.setDate(1);
    return this.startOfDay(result);
  }

  /**
   * Gets the end of month for a date
   */
  static endOfMonth(date: Date): Date {
    if (!this.isValidDate(date)) return new Date();

    const result = new Date(date);
    result.setMonth(result.getMonth() + 1, 0);
    return this.endOfDay(result);
  }

  /**
   * Gets the start of year for a date
   */
  static startOfYear(date: Date): Date {
    if (!this.isValidDate(date)) return new Date();

    const result = new Date(date);
    result.setMonth(0, 1);
    return this.startOfDay(result);
  }

  /**
   * Gets the end of year for a date
   */
  static endOfYear(date: Date): Date {
    if (!this.isValidDate(date)) return new Date();

    const result = new Date(date);
    result.setMonth(11, 31);
    return this.endOfDay(result);
  }

  /**
   * Adds days to a date
   */
  static addDays(date: Date, days: number): Date {
    if (!this.isValidDate(date)) return new Date();

    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  /**
   * Adds months to a date
   */
  static addMonths(date: Date, months: number): Date {
    if (!this.isValidDate(date)) return new Date();

    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
  }

  /**
   * Adds years to a date
   */
  static addYears(date: Date, years: number): Date {
    if (!this.isValidDate(date)) return new Date();

    const result = new Date(date);
    result.setFullYear(result.getFullYear() + years);
    return result;
  }

  /**
   * Calculates the difference between two dates in days
   */
  static diffInDays(date1: Date, date2: Date): number {
    if (!this.isValidDate(date1) || !this.isValidDate(date2)) return 0;

    const diffMs = Math.abs(date1.getTime() - date2.getTime());
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  /**
   * Calculates the difference between two dates in hours
   */
  static diffInHours(date1: Date, date2: Date): number {
    if (!this.isValidDate(date1) || !this.isValidDate(date2)) return 0;

    const diffMs = Math.abs(date1.getTime() - date2.getTime());
    return Math.floor(diffMs / (1000 * 60 * 60));
  }

  /**
   * Calculates the difference between two dates in minutes
   */
  static diffInMinutes(date1: Date, date2: Date): number {
    if (!this.isValidDate(date1) || !this.isValidDate(date2)) return 0;

    const diffMs = Math.abs(date1.getTime() - date2.getTime());
    return Math.floor(diffMs / (1000 * 60));
  }

  /**
   * Checks if a date is today
   */
  static isToday(date: Date): boolean {
    if (!this.isValidDate(date)) return false;

    const today = new Date();
    return this.isSameDay(date, today);
  }

  /**
   * Checks if a date is yesterday
   */
  static isYesterday(date: Date): boolean {
    if (!this.isValidDate(date)) return false;

    const yesterday = this.addDays(new Date(), -1);
    return this.isSameDay(date, yesterday);
  }

  /**
   * Checks if a date is tomorrow
   */
  static isTomorrow(date: Date): boolean {
    if (!this.isValidDate(date)) return false;

    const tomorrow = this.addDays(new Date(), 1);
    return this.isSameDay(date, tomorrow);
  }

  /**
   * Checks if two dates are the same day
   */
  static isSameDay(date1: Date, date2: Date): boolean {
    if (!this.isValidDate(date1) || !this.isValidDate(date2)) return false;

    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }

  /**
   * Checks if two dates are the same month
   */
  static isSameMonth(date1: Date, date2: Date): boolean {
    if (!this.isValidDate(date1) || !this.isValidDate(date2)) return false;

    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth()
    );
  }

  /**
   * Checks if two dates are the same year
   */
  static isSameYear(date1: Date, date2: Date): boolean {
    if (!this.isValidDate(date1) || !this.isValidDate(date2)) return false;

    return date1.getFullYear() === date2.getFullYear();
  }

  /**
   * Checks if a date is in the past
   */
  static isPast(date: Date, now = new Date()): boolean {
    if (!this.isValidDate(date)) return false;

    return date.getTime() < now.getTime();
  }

  /**
   * Checks if a date is in the future
   */
  static isFuture(date: Date, now = new Date()): boolean {
    if (!this.isValidDate(date)) return false;

    return date.getTime() > now.getTime();
  }

  /**
   * Gets the age in years from a birth date
   */
  static getAge(birthDate: Date, now = new Date()): number {
    if (!this.isValidDate(birthDate)) return 0;

    const age = now.getFullYear() - birthDate.getFullYear();
    const monthDiff = now.getMonth() - birthDate.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && now.getDate() < birthDate.getDate())
    ) {
      return age - 1;
    }

    return age;
  }

  /**
   * Gets the number of days in a month
   */
  static getDaysInMonth(date: Date): number {
    if (!this.isValidDate(date)) return 0;

    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  }

  /**
   * Checks if a year is a leap year
   */
  static isLeapYear(year: number): boolean {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  }

  /**
   * Gets the timezone offset in minutes
   */
  static getTimezoneOffset(date: Date): number {
    if (!this.isValidDate(date)) return 0;

    return date.getTimezoneOffset();
  }

  /**
   * Converts a date to UTC
   */
  static toUTC(date: Date): Date {
    if (!this.isValidDate(date)) return new Date();

    return new Date(date.getTime() + date.getTimezoneOffset() * 60000);
  }

  /**
   * Converts a UTC date to local time
   */
  static fromUTC(date: Date): Date {
    if (!this.isValidDate(date)) return new Date();

    return new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  }
}
