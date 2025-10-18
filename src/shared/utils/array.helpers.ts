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
   * @param arr Array to check
   * @returns True if array is empty
   */
  static isEmpty<T>(arr: T[]): boolean {
    return !arr || arr.length === 0;
  }

  /**
   * Checks if an array is not empty
   * @param arr Array to check
   * @returns True if array is not empty
   */
  static isNotEmpty<T>(arr: T[]): boolean {
    return !this.isEmpty(arr);
  }

  /**
   * Gets the first element of an array
   * @param arr Array to get first element from
   * @returns First element or undefined
   */
  static first<T>(arr: T[]): T | undefined {
    return this.isEmpty(arr) ? undefined : arr[0];
  }

  /**
   * Gets the last element of an array
   * @param arr Array to get last element from
   * @returns Last element or undefined
   */
  static last<T>(arr: T[]): T | undefined {
    return this.isEmpty(arr) ? undefined : arr[arr.length - 1];
  }

  /**
   * Gets the nth element of an array
   * @param arr Array to get element from
   * @param index Index of element to get
   * @returns Element at index or undefined
   */
  static nth<T>(arr: T[], index: number): T | undefined {
    if (this.isEmpty(arr) || index < 0 || index >= arr.length) {
      return undefined;
    }
    return arr[index];
  }

  /**
   * Gets a random element from an array
   * @param arr Array to get random element from
   * @returns Random element or undefined
   */
  static random<T>(arr: T[]): T | undefined {
    if (this.isEmpty(arr)) return undefined;
    const randomIndex = Math.floor(Math.random() * arr.length);
    return arr[randomIndex];
  }

  /**
   * Gets multiple random elements from an array
   * @param arr Array to get random elements from
   * @param count Number of random elements to get
   * @returns Array of random elements
   */
  static randomMultiple<T>(arr: T[], count: number): T[] {
    if (this.isEmpty(arr) || count <= 0) return [];

    const shuffled = [...arr].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, arr.length));
  }

  /**
   * Shuffles an array in place
   * @param arr Array to shuffle
   * @returns Shuffled array
   */
  static shuffle<T>(arr: T[]): T[] {
    if (this.isEmpty(arr)) return arr;

    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }

    return arr;
  }

  /**
   * Creates a shuffled copy of an array
   * @param arr Array to shuffle
   * @returns New shuffled array
   */
  static shuffleCopy<T>(arr: T[]): T[] {
    return this.shuffle([...arr]);
  }

  /**
   * Removes duplicate elements from an array
   * @param arr Array to deduplicate
   * @returns New array with unique elements
   */
  static unique<T>(arr: T[]): T[] {
    if (this.isEmpty(arr)) return arr;
    return [...new Set(arr)];
  }

  /**
   * Removes duplicate elements from an array using a key function
   * @param arr Array to deduplicate
   * @param keyFn Function to extract key for comparison
   * @returns New array with unique elements
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
   * @param arr Array to group
   * @param keyFn Function to extract key for grouping
   * @returns Object with grouped elements
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
   * Partitions an array into two arrays based on a predicate
   * @param arr Array to partition
   * @param predicate Function to test each element
   * @returns Tuple of [true elements, false elements]
   */
  static partition<T>(arr: T[], predicate: (item: T) => boolean): [T[], T[]] {
    if (this.isEmpty(arr)) return [[], []];

    const trueItems: T[] = [];
    const falseItems: T[] = [];

    for (const item of arr) {
      if (predicate(item)) {
        trueItems.push(item);
      } else {
        falseItems.push(item);
      }
    }

    return [trueItems, falseItems];
  }

  /**
   * Chunks an array into smaller arrays of specified size
   * @param arr Array to chunk
   * @param size Size of each chunk
   * @returns Array of chunks
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
   * @param arr Array to flatten
   * @returns Flattened array
   */
  static flatten<T>(arr: (T | T[])[]): T[] {
    if (this.isEmpty(arr)) return [];
    return arr.reduce((flat, item) => {
      return flat.concat(Array.isArray(item) ? item : [item]);
    }, [] as T[]);
  }

  /**
   * Deeply flattens a nested array
   * @param arr Array to flatten
   * @returns Deeply flattened array
   */
  static flattenDeep<T>(arr: any[]): T[] {
    if (this.isEmpty(arr)) return [];

    return arr.reduce((flat, item) => {
      return flat.concat(Array.isArray(item) ? this.flattenDeep(item) : item);
    }, [] as T[]);
  }

  /**
   * Intersects two arrays (elements that exist in both)
   * @param arr1 First array
   * @param arr2 Second array
   * @returns Array of intersecting elements
   */
  static intersection<T>(arr1: T[], arr2: T[]): T[] {
    if (this.isEmpty(arr1) || this.isEmpty(arr2)) return [];

    const set2 = new Set(arr2);
    return arr1.filter((item) => set2.has(item));
  }

  /**
   * Gets the difference between two arrays (elements in first but not second)
   * @param arr1 First array
   * @param arr2 Second array
   * @returns Array of different elements
   */
  static difference<T>(arr1: T[], arr2: T[]): T[] {
    if (this.isEmpty(arr1)) return [];
    if (this.isEmpty(arr2)) return [...arr1];

    const set2 = new Set(arr2);
    return arr1.filter((item) => !set2.has(item));
  }

  /**
   * Gets the symmetric difference between two arrays (elements in either but not both)
   * @param arr1 First array
   * @param arr2 Second array
   * @returns Array of symmetric different elements
   */
  static symmetricDifference<T>(arr1: T[], arr2: T[]): T[] {
    const diff1 = this.difference(arr1, arr2);
    const diff2 = this.difference(arr2, arr1);
    return [...diff1, ...diff2];
  }

  /**
   * Gets the union of two arrays (all unique elements from both)
   * @param arr1 First array
   * @param arr2 Second array
   * @returns Array of union elements
   */
  static union<T>(arr1: T[], arr2: T[]): T[] {
    return this.unique([...arr1, ...arr2]);
  }

  /**
   * Sorts an array by a key function
   * @param arr Array to sort
   * @param keyFn Function to extract key for sorting
   * @param order Sort order (asc or desc)
   * @returns New sorted array
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
   * Sorts an array by multiple key functions
   * @param arr Array to sort
   * @param keyFns Array of key functions for multi-level sorting
   * @param orders Array of sort orders for each key
   * @returns New sorted array
   */
  static sortByMultiple<T>(
    arr: T[],
    keyFns: Array<(item: T) => any>,
    orders: Array<"asc" | "desc"> = []
  ): T[] {
    if (this.isEmpty(arr) || keyFns.length === 0) return arr;

    return [...arr].sort((a, b) => {
      for (let i = 0; i < keyFns.length; i++) {
        const keyFn = keyFns[i];
        const order = orders[i] || "asc";
        const keyA = keyFn(a);
        const keyB = keyFn(b);

        if (keyA < keyB) return order === "asc" ? -1 : 1;
        if (keyA > keyB) return order === "asc" ? 1 : -1;
      }
      return 0;
    });
  }

  /**
   * Finds the maximum element in an array
   * @param arr Array to find max in
   * @param keyFn Optional function to extract key for comparison
   * @returns Maximum element or undefined
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
   * @param arr Array to find min in
   * @param keyFn Optional function to extract key for comparison
   * @returns Minimum element or undefined
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
   * @param arr Array to sum
   * @param keyFn Optional function to extract value for summing
   * @returns Sum of array elements
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
   * @param arr Array to average
   * @param keyFn Optional function to extract value for averaging
   * @returns Average of array elements
   */
  static average<T>(arr: T[], keyFn?: (item: T) => number): number {
    if (this.isEmpty(arr)) return 0;

    const sum = this.sum(arr, keyFn);
    return sum / arr.length;
  }

  /**
   * Counts elements in an array that match a predicate
   * @param arr Array to count in
   * @param predicate Function to test each element
   * @returns Number of matching elements
   */
  static count<T>(arr: T[], predicate: (item: T) => boolean): number {
    if (this.isEmpty(arr)) return 0;

    return arr.reduce((count, item) => {
      return count + (predicate(item) ? 1 : 0);
    }, 0);
  }

  /**
   * Counts elements in an array by a key function
   * @param arr Array to count in
   * @param keyFn Function to extract key for counting
   * @returns Object with counts for each key
   */
  static countBy<T, K extends string | number | symbol>(
    arr: T[],
    keyFn: (item: T) => K
  ): Record<K, number> {
    if (this.isEmpty(arr)) return {} as Record<K, number>;

    return arr.reduce((counts, item) => {
      const key = keyFn(item);
      counts[key] = (counts[key] || 0) + 1;
      return counts;
    }, {} as Record<K, number>);
  }

  /**
   * Samples elements from an array
   * @param arr Array to sample from
   * @param count Number of elements to sample
   * @returns Array of sampled elements
   */
  static sample<T>(arr: T[], count: number): T[] {
    if (this.isEmpty(arr) || count <= 0) return [];

    const shuffled = this.shuffleCopy(arr);
    return shuffled.slice(0, Math.min(count, arr.length));
  }

  /**
   * Takes elements from the beginning of an array
   * @param arr Array to take from
   * @param count Number of elements to take
   * @returns Array of taken elements
   */
  static take<T>(arr: T[], count: number): T[] {
    if (this.isEmpty(arr) || count <= 0) return [];
    return arr.slice(0, count);
  }

  /**
   * Takes elements from the end of an array
   * @param arr Array to take from
   * @param count Number of elements to take
   * @returns Array of taken elements
   */
  static takeRight<T>(arr: T[], count: number): T[] {
    if (this.isEmpty(arr) || count <= 0) return [];
    return arr.slice(-count);
  }

  /**
   * Drops elements from the beginning of an array
   * @param arr Array to drop from
   * @param count Number of elements to drop
   * @returns Array with elements dropped
   */
  static drop<T>(arr: T[], count: number): T[] {
    if (this.isEmpty(arr) || count <= 0) return arr;
    return arr.slice(count);
  }

  /**
   * Drops elements from the end of an array
   * @param arr Array to drop from
   * @param count Number of elements to drop
   * @returns Array with elements dropped
   */
  static dropRight<T>(arr: T[], count: number): T[] {
    if (this.isEmpty(arr) || count <= 0) return arr;
    return arr.slice(0, -count);
  }

  /**
   * Creates an array of numbers from start to end
   * @param start Start number
   * @param end End number
   * @param step Step size
   * @returns Array of numbers
   */
  static range(start: number, end: number, step: number = 1): number[] {
    if (step === 0) return [];

    const result: number[] = [];
    const direction = step > 0 ? 1 : -1;

    for (let i = start; direction * i < direction * end; i += step) {
      result.push(i);
    }

    return result;
  }

  /**
   * Creates an array filled with a value
   * @param length Length of array
   * @param value Value to fill with
   * @returns Array filled with value
   */
  static fill<T>(length: number, value: T): T[] {
    if (length <= 0) return [];
    return new Array(length).fill(value);
  }

  /**
   * Creates an array of indices
   * @param length Length of array
   * @returns Array of indices
   */
  static indices(length: number): number[] {
    return this.range(0, length);
  }

  /**
   * Zips two arrays together
   * @param arr1 First array
   * @param arr2 Second array
   * @returns Array of tuples
   */
  static zip<T, U>(arr1: T[], arr2: U[]): [T, U][] {
    const result: [T, U][] = [];
    const minLength = Math.min(arr1.length, arr2.length);

    for (let i = 0; i < minLength; i++) {
      result.push([arr1[i], arr2[i]]);
    }

    return result;
  }

  /**
   * Unzips an array of tuples
   * @param arr Array of tuples
   * @returns Tuple of arrays
   */
  static unzip<T, U>(arr: [T, U][]): [T[], U[]] {
    const arr1: T[] = [];
    const arr2: U[] = [];

    for (const [item1, item2] of arr) {
      arr1.push(item1);
      arr2.push(item2);
    }

    return [arr1, arr2];
  }
}
