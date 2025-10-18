/**
 * @fileoverview Array Helper Utilities
 *
 * Utility functions for array manipulation, filtering, and transformation
 * across all domains in the 9to5 Scout platform.
 *
 * @author 9to5 Scout AI Team
 * @version 1.0.0
 * @since 2024-01-01
 */

/**
 * Array utility functions
 */
export class ArrayUtils {
  /**
   * Checks if an array is empty
   */
  static isEmpty<T>(arr: T[]): boolean {
    return !arr || arr.length === 0;
  }

  /**
   * Checks if an array is not empty
   */
  static isNotEmpty<T>(arr: T[]): boolean {
    return !this.isEmpty(arr);
  }

  /**
   * Gets the first element of an array
   */
  static first<T>(arr: T[]): T | undefined {
    return this.isEmpty(arr) ? undefined : arr[0];
  }

  /**
   * Gets the last element of an array
   */
  static last<T>(arr: T[]): T | undefined {
    return this.isEmpty(arr) ? undefined : arr[arr.length - 1];
  }

  /**
   * Removes duplicate elements from an array
   */
  static unique<T>(arr: T[]): T[] {
    if (this.isEmpty(arr)) return arr;
    return [...new Set(arr)];
  }

  /**
   * Removes duplicate elements from an array using a key function
   */
  static uniqueBy<T, K>(arr: T[], keyFn: (item: T) => K): T[] {
    if (this.isEmpty(arr)) return arr;

    const seen = new Set<K>();
    return arr.filter((item) => {
      const key = keyFn(item);
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Groups array elements by a key function
   */
  static groupBy<T, K extends string | number | symbol>(
    arr: T[],
    keyFn: (item: T) => K
  ): Record<K, T[]> {
    if (this.isEmpty(arr)) return {} as Record<K, T[]>;

    return arr.reduce((groups, item) => {
      const key = keyFn(item);
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
      return groups;
    }, {} as Record<K, T[]>);
  }

  /**
   * Chunks an array into smaller arrays of specified size
   */
  static chunk<T>(arr: T[], size: number): T[][] {
    if (this.isEmpty(arr) || size <= 0) return [];

    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }

    return chunks;
  }

  /**
   * Flattens a nested array one level deep
   */
  static flatten<T>(arr: (T | T[])[]): T[] {
    if (this.isEmpty(arr)) return [];
    return arr.reduce((flat, item) => {
      return flat.concat(Array.isArray(item) ? item : [item]);
    }, [] as T[]);
  }

  /**
   * Sorts an array by a key function
   */
  static sortBy<T, K>(
    arr: T[],
    keyFn: (item: T) => K,
    order: "asc" | "desc" = "asc"
  ): T[] {
    if (this.isEmpty(arr)) return arr;

    return [...arr].sort((a, b) => {
      const keyA = keyFn(a);
      const keyB = keyFn(b);

      if (keyA < keyB) return order === "asc" ? -1 : 1;
      if (keyA > keyB) return order === "asc" ? 1 : -1;
      return 0;
    });
  }

  /**
   * Finds the maximum element in an array
   */
  static max<T>(arr: T[], keyFn?: (item: T) => number): T | undefined {
    if (this.isEmpty(arr)) return undefined;

    if (keyFn) {
      return arr.reduce((max, item) => {
        return keyFn(item) > keyFn(max) ? item : max;
      });
    }

    return arr.reduce((max, item) => {
      return item > max ? item : max;
    });
  }

  /**
   * Finds the minimum element in an array
   */
  static min<T>(arr: T[], keyFn?: (item: T) => number): T | undefined {
    if (this.isEmpty(arr)) return undefined;

    if (keyFn) {
      return arr.reduce((min, item) => {
        return keyFn(item) < keyFn(min) ? item : min;
      });
    }

    return arr.reduce((min, item) => {
      return item < min ? item : min;
    });
  }

  /**
   * Calculates the sum of an array
   */
  static sum<T>(arr: T[], keyFn?: (item: T) => number): number {
    if (this.isEmpty(arr)) return 0;

    if (keyFn) {
      return arr.reduce((sum, item) => sum + keyFn(item), 0);
    }

    return arr.reduce((sum, item) => {
      const num = Number(item);
      return sum + (isNaN(num) ? 0 : num);
    }, 0);
  }

  /**
   * Calculates the average of an array
   */
  static average<T>(arr: T[], keyFn?: (item: T) => number): number {
    if (this.isEmpty(arr)) return 0;

    const sum = this.sum(arr, keyFn);
    return sum / arr.length;
  }
}
