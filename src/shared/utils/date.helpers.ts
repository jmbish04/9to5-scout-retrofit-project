/**
 * @fileoverview Date Helper Utilities
 *
 * Utility functions for date manipulation, calculation, and formatting
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
   * Creates a new Date object from various input types
   * @param input Date input (string, number, or Date)
   * @returns Date object or null if invalid
   */
  static fromInput(input: string | number | Date): Date | null {
    if (input instanceof Date) {
      return isNaN(input.getTime()) ? null : input;
    }
    
    if (typeof input === "number") {
      const date = new Date(input);
      return isNaN(date.getTime()) ? null : date;
    }
    
    if (typeof input === "string") {
      const date = new Date(input);
      return isNaN(date.getTime()) ? null : date;
    }
    
    return null;
  }
  
  /**
   * Gets the start of a day
   * @param date Date to get start of day for
   * @returns Date object at start of day
   */
  static startOfDay(date: Date): Date {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
  }
  
  /**
   * Gets the end of a day
   * @param date Date to get end of day for
   * @returns Date object at end of day
   */
  static endOfDay(date: Date): Date {
    const result = new Date(date);
    result.setHours(23, 59, 59, 999);
    return result;
  }
  
  /**
   * Gets the start of a week
   * @param date Date to get start of week for
   * @param startDay Day of week to start on (0 = Sunday, 1 = Monday, etc.)
   * @returns Date object at start of week
   */
  static startOfWeek(date: Date, startDay: number = 1): Date {
    const result = new Date(date);
    const day = result.getDay();
    const diff = (day < startDay ? 7 : 0) + day - startDay;
    result.setDate(result.getDate() - diff);
    return this.startOfDay(result);
  }
  
  /**
   * Gets the end of a week
   * @param date Date to get end of week for
   * @param startDay Day of week to start on (0 = Sunday, 1 = Monday, etc.)
   * @returns Date object at end of week
   */
  static endOfWeek(date: Date, startDay: number = 1): Date {
    const result = new Date(date);
    const day = result.getDay();
    const diff = (day < startDay ? 7 : 0) + day - startDay;
    result.setDate(result.getDate() - diff + 6);
    return this.endOfDay(result);
  }
  
  /**
   * Gets the start of a month
   * @param date Date to get start of month for
   * @returns Date object at start of month
   */
  static startOfMonth(date: Date): Date {
    const result = new Date(date);
    result.setDate(1);
    return this.startOfDay(result);
  }
  
  /**
   * Gets the end of a month
   * @param date Date to get end of month for
   * @returns Date object at end of month
   */
  static endOfMonth(date: Date): Date {
    const result = new Date(date);
    result.setMonth(result.getMonth() + 1, 0);
    return this.endOfDay(result);
  }
  
  /**
   * Gets the start of a year
   * @param date Date to get start of year for
   * @returns Date object at start of year
   */
  static startOfYear(date: Date): Date {
    const result = new Date(date);
    result.setMonth(0, 1);
    return this.startOfDay(result);
  }
  
  /**
   * Gets the end of a year
   * @param date Date to get end of year for
   * @returns Date object at end of year
   */
  static endOfYear(date: Date): Date {
    const result = new Date(date);
    result.setMonth(11, 31);
    return this.endOfDay(result);
  }
  
  /**
   * Adds time to a date
   * @param date Base date
   * @param amount Amount to add
   * @param unit Unit of time to add
   * @returns New date with time added
   */
  static add(
    date: Date,
    amount: number,
    unit: "milliseconds" | "seconds" | "minutes" | "hours" | "days" | "weeks" | "months" | "years"
  ): Date {
    const result = new Date(date);
    
    switch (unit) {
      case "milliseconds":
        result.setMilliseconds(result.getMilliseconds() + amount);
        break;
      case "seconds":
        result.setSeconds(result.getSeconds() + amount);
        break;
      case "minutes":
        result.setMinutes(result.getMinutes() + amount);
        break;
      case "hours":
        result.setHours(result.getHours() + amount);
        break;
      case "days":
        result.setDate(result.getDate() + amount);
        break;
      case "weeks":
        result.setDate(result.getDate() + (amount * 7));
        break;
      case "months":
        result.setMonth(result.getMonth() + amount);
        break;
      case "years":
        result.setFullYear(result.getFullYear() + amount);
        break;
    }
    
    return result;
  }
  
  /**
   * Subtracts time from a date
   * @param date Base date
   * @param amount Amount to subtract
   * @param unit Unit of time to subtract
   * @returns New date with time subtracted
   */
  static subtract(
    date: Date,
    amount: number,
    unit: "milliseconds" | "seconds" | "minutes" | "hours" | "days" | "weeks" | "months" | "years"
  ): Date {
    return this.add(date, -amount, unit);
  }
  
  /**
   * Gets the difference between two dates
   * @param date1 First date
   * @param date2 Second date
   * @param unit Unit of time for the difference
   * @returns Difference in the specified unit
   */
  static diff(
    date1: Date,
    date2: Date,
    unit: "milliseconds" | "seconds" | "minutes" | "hours" | "days" | "weeks" | "months" | "years"
  ): number {
    const diffInMs = date1.getTime() - date2.getTime();
    
    switch (unit) {
      case "milliseconds":
        return diffInMs;
      case "seconds":
        return Math.floor(diffInMs / 1000);
      case "minutes":
        return Math.floor(diffInMs / (1000 * 60));
      case "hours":
        return Math.floor(diffInMs / (1000 * 60 * 60));
      case "days":
        return Math.floor(diffInMs / (1000 * 60 * 60 * 24));
      case "weeks":
        return Math.floor(diffInMs / (1000 * 60 * 60 * 24 * 7));
      case "months":
        return Math.floor(diffInMs / (1000 * 60 * 60 * 24 * 30.44)); // Average month length
      case "years":
        return Math.floor(diffInMs / (1000 * 60 * 60 * 24 * 365.25)); // Average year length
      default:
        return diffInMs;
    }
  }
  
  /**
   * Checks if a date is within a range
   * @param date Date to check
   * @param start Start of range
   * @param end End of range
   * @param inclusive Whether to include the boundary dates
   * @returns True if date is within range
   */
  static isWithinRange(
    date: Date,
    start: Date,
    end: Date,
    inclusive: boolean = true
  ): boolean {
    if (inclusive) {
      return date >= start && date <= end;
    }
    return date > start && date < end;
  }
  
  /**
   * Checks if a date is today
   * @param date Date to check
   * @returns True if date is today
   */
  static isToday(date: Date): boolean {
    const today = new Date();
    return this.isSameDay(date, today);
  }
  
  /**
   * Checks if a date is yesterday
   * @param date Date to check
   * @returns True if date is yesterday
   */
  static isYesterday(date: Date): boolean {
    const yesterday = this.subtract(new Date(), 1, "days");
    return this.isSameDay(date, yesterday);
  }
  
  /**
   * Checks if a date is tomorrow
   * @param date Date to check
   * @returns True if date is tomorrow
   */
  static isTomorrow(date: Date): boolean {
    const tomorrow = this.add(new Date(), 1, "days");
    return this.isSameDay(date, tomorrow);
  }
  
  /**
   * Checks if two dates are the same day
   * @param date1 First date
   * @param date2 Second date
   * @returns True if dates are the same day
   */
  static isSameDay(date1: Date, date2: Date): boolean {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }
  
  /**
   * Checks if two dates are the same month
   * @param date1 First date
   * @param date2 Second date
   * @returns True if dates are the same month
   */
  static isSameMonth(date1: Date, date2: Date): boolean {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth()
    );
  }
  
  /**
   * Checks if two dates are the same year
   * @param date1 First date
   * @param date2 Second date
   * @returns True if dates are the same year
   */
  static isSameYear(date1: Date, date2: Date): boolean {
    return date1.getFullYear() === date2.getFullYear();
  }
  
  /**
   * Gets the age in years
   * @param birthDate Birth date
   * @param referenceDate Reference date (default: today)
   * @returns Age in years
   */
  static getAge(birthDate: Date, referenceDate: Date = new Date()): number {
    let age = referenceDate.getFullYear() - birthDate.getFullYear();
    const monthDiff = referenceDate.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && referenceDate.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }
  
  /**
   * Gets the number of days in a month
   * @param year Year
   * @param month Month (0-11)
   * @returns Number of days in the month
   */
  static getDaysInMonth(year: number, month: number): number {
    return new Date(year, month + 1, 0).getDate();
  }
  
  /**
   * Checks if a year is a leap year
   * @param year Year to check
   * @returns True if year is a leap year
   */
  static isLeapYear(year: number): boolean {
    return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  }
  
  /**
   * Gets the quarter of a date
   * @param date Date to get quarter for
   * @returns Quarter number (1-4)
   */
  static getQuarter(date: Date): number {
    return Math.floor(date.getMonth() / 3) + 1;
  }
  
  /**
   * Gets the week number of a date
   * @param date Date to get week number for
   * @param startDay Day of week to start on (0 = Sunday, 1 = Monday, etc.)
   * @returns Week number
   */
  static getWeekNumber(date: Date, startDay: number = 1): number {
    const startOfYear = this.startOfYear(date);
    const startOfFirstWeek = this.startOfWeek(startOfYear, startDay);
    
    if (date < startOfFirstWeek) {
      return 1;
    }
    
    const diffInDays = this.diff(date, startOfFirstWeek, "days");
    return Math.floor(diffInDays / 7) + 1;
  }
  
  /**
   * Converts a date to ISO string
   * @param date Date to convert
   * @returns ISO string
   */
  static toISOString(date: Date): string {
    return date.toISOString();
  }
  
  /**
   * Converts a date to UTC string
   * @param date Date to convert
   * @returns UTC string
   */
  static toUTCString(date: Date): string {
    return date.toUTCString();
  }
  
  /**
   * Converts a date to a timestamp
   * @param date Date to convert
   * @returns Timestamp in milliseconds
   */
  static toTimestamp(date: Date): number {
    return date.getTime();
  }
  
  /**
   * Creates a date from a timestamp
   * @param timestamp Timestamp in milliseconds
   * @returns Date object
   */
  static fromTimestamp(timestamp: number): Date {
    return new Date(timestamp);
  }
  
  /**
   * Gets the current date and time
   * @returns Current date
   */
  static now(): Date {
    return new Date();
  }
  
  /**
   * Gets the current date at start of day
   * @returns Current date at start of day
   */
  static today(): Date {
    return this.startOfDay(new Date());
  }
  
  /**
   * Gets yesterday's date
   * @returns Yesterday's date
   */
  static yesterday(): Date {
    return this.subtract(new Date(), 1, "days");
  }
  
  /**
   * Gets tomorrow's date
   * @returns Tomorrow's date
   */
  static tomorrow(): Date {
    return this.add(new Date(), 1, "days");
  }
}
