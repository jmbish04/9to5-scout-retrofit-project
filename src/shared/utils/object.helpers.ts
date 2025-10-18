/**
 * @fileoverview Object Helper Utilities
 *
 * Utility functions for object manipulation, validation, and transformation
 * across all domains in the 9to5 Scout platform.
 *
 * @author 9to5 Scout AI Team
 * @version 1.0.0
 * @since 2024-01-01
 */

/**
 * Object utility functions
 */
export class ObjectUtils {
  /**
   * Checks if a value is an object
   * @param value Value to check
   * @returns True if value is an object
   */
  static isObject(value: any): value is object {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  /**
   * Checks if a value is a plain object
   * @param value Value to check
   * @returns True if value is a plain object
   */
  static isPlainObject(value: any): value is Record<string, any> {
    return (
      this.isObject(value) &&
      Object.prototype.toString.call(value) === "[object Object]"
    );
  }

  /**
   * Checks if an object is empty
   * @param obj Object to check
   * @returns True if object is empty
   */
  static isEmpty(obj: object): boolean {
    return Object.keys(obj).length === 0;
  }

  /**
   * Checks if an object is not empty
   * @param obj Object to check
   * @returns True if object is not empty
   */
  static isNotEmpty(obj: object): boolean {
    return !this.isEmpty(obj);
  }

  /**
   * Gets the keys of an object
   * @param obj Object to get keys from
   * @returns Array of keys
   */
  static keys<T extends object>(obj: T): Array<keyof T> {
    return Object.keys(obj) as Array<keyof T>;
  }

  /**
   * Gets the values of an object
   * @param obj Object to get values from
   * @returns Array of values
   */
  static values<T extends object>(obj: T): Array<T[keyof T]> {
    return Object.values(obj);
  }

  /**
   * Gets the entries of an object
   * @param obj Object to get entries from
   * @returns Array of [key, value] pairs
   */
  static entries<T extends object>(obj: T): Array<[keyof T, T[keyof T]]> {
    return Object.entries(obj) as Array<[keyof T, T[keyof T]]>;
  }

  /**
   * Creates an object from an array of [key, value] pairs
   * @param entries Array of [key, value] pairs
   * @returns Object created from entries
   */
  static fromEntries<T extends string | number | symbol, U>(
    entries: Array<[T, U]>
  ): Record<T, U> {
    return Object.fromEntries(entries) as Record<T, U>;
  }

  /**
   * Gets a nested property value from an object
   * @param obj Object to get property from
   * @param path Path to the property (e.g., "user.profile.name")
   * @param defaultValue Default value if property doesn't exist
   * @returns Property value or default value
   */
  static get<T = any>(obj: any, path: string, defaultValue?: T): T | undefined {
    if (!this.isObject(obj) || !path) return defaultValue;

    const keys = path.split(".");
    let current = obj;

    for (const key of keys) {
      if (
        current === null ||
        current === undefined ||
        !this.isObject(current)
      ) {
        return defaultValue;
      }
      current = current[key];
    }

    return current !== undefined ? current : defaultValue;
  }

  /**
   * Sets a nested property value in an object
   * @param obj Object to set property in
   * @param path Path to the property (e.g., "user.profile.name")
   * @param value Value to set
   * @returns New object with property set
   */
  static set<T extends object>(obj: T, path: string, value: any): T {
    if (!this.isObject(obj) || !path) return obj;

    const keys = path.split(".");
    const result = { ...obj };
    let current = result;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!this.isObject(current[key])) {
        current[key] = {};
      }
      current = current[key];
    }

    current[keys[keys.length - 1]] = value;
    return result;
  }

  /**
   * Checks if an object has a nested property
   * @param obj Object to check
   * @param path Path to the property (e.g., "user.profile.name")
   * @returns True if property exists
   */
  static has(obj: any, path: string): boolean {
    if (!this.isObject(obj) || !path) return false;

    const keys = path.split(".");
    let current = obj;

    for (const key of keys) {
      if (!this.isObject(current) || !(key in current)) {
        return false;
      }
      current = current[key];
    }

    return true;
  }

  /**
   * Deletes a nested property from an object
   * @param obj Object to delete property from
   * @param path Path to the property (e.g., "user.profile.name")
   * @returns New object with property deleted
   */
  static unset<T extends object>(obj: T, path: string): T {
    if (!this.isObject(obj) || !path) return obj;

    const keys = path.split(".");
    const result = { ...obj };
    let current = result;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!this.isObject(current[key])) {
        return result;
      }
      current = { ...current[key] };
    }

    delete current[keys[keys.length - 1]];
    return result;
  }

  /**
   * Picks specific properties from an object
   * @param obj Object to pick from
   * @param keys Keys to pick
   * @returns New object with only picked properties
   */
  static pick<T extends object, K extends keyof T>(
    obj: T,
    keys: K[]
  ): Pick<T, K> {
    const result = {} as Pick<T, K>;

    for (const key of keys) {
      if (key in obj) {
        result[key] = obj[key];
      }
    }

    return result;
  }

  /**
   * Omits specific properties from an object
   * @param obj Object to omit from
   * @param keys Keys to omit
   * @returns New object without omitted properties
   */
  static omit<T extends object, K extends keyof T>(
    obj: T,
    keys: K[]
  ): Omit<T, K> {
    const result = { ...obj };

    for (const key of keys) {
      delete result[key];
    }

    return result;
  }

  /**
   * Merges two objects deeply
   * @param target Target object
   * @param source Source object
   * @returns New merged object
   */
  static merge<T extends object, U extends object>(
    target: T,
    source: U
  ): T & U {
    const result = { ...target } as T & U;

    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        const sourceValue = source[key];
        const targetValue = result[key];

        if (
          this.isPlainObject(sourceValue) &&
          this.isPlainObject(targetValue)
        ) {
          result[key] = this.merge(targetValue, sourceValue) as any;
        } else {
          result[key] = sourceValue as any;
        }
      }
    }

    return result;
  }

  /**
   * Merges multiple objects deeply
   * @param objects Objects to merge
   * @returns New merged object
   */
  static mergeAll<T extends object>(...objects: T[]): T {
    if (objects.length === 0) return {} as T;
    if (objects.length === 1) return objects[0];

    return objects.reduce((result, obj) => this.merge(result, obj), {} as T);
  }

  /**
   * Clones an object deeply
   * @param obj Object to clone
   * @returns Deep clone of the object
   */
  static clone<T>(obj: T): T {
    if (obj === null || typeof obj !== "object") {
      return obj;
    }

    if (obj instanceof Date) {
      return new Date(obj.getTime()) as T;
    }

    if (obj instanceof Array) {
      return obj.map((item) => this.clone(item)) as T;
    }

    if (this.isPlainObject(obj)) {
      const cloned = {} as T;
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          cloned[key] = this.clone(obj[key]);
        }
      }
      return cloned;
    }

    return obj;
  }

  /**
   * Compares two objects deeply
   * @param obj1 First object
   * @param obj2 Second object
   * @returns True if objects are deeply equal
   */
  static isEqual(obj1: any, obj2: any): boolean {
    if (obj1 === obj2) return true;

    if (obj1 === null || obj2 === null) return obj1 === obj2;

    if (typeof obj1 !== typeof obj2) return false;

    if (typeof obj1 !== "object") return obj1 === obj2;

    if (Array.isArray(obj1) !== Array.isArray(obj2)) return false;

    if (Array.isArray(obj1)) {
      if (obj1.length !== obj2.length) return false;
      for (let i = 0; i < obj1.length; i++) {
        if (!this.isEqual(obj1[i], obj2[i])) return false;
      }
      return true;
    }

    const keys1 = this.keys(obj1);
    const keys2 = this.keys(obj2);

    if (keys1.length !== keys2.length) return false;

    for (const key of keys1) {
      if (!keys2.includes(key)) return false;
      if (!this.isEqual(obj1[key], obj2[key])) return false;
    }

    return true;
  }

  /**
   * Transforms an object's keys
   * @param obj Object to transform
   * @param transformFn Function to transform keys
   * @returns New object with transformed keys
   */
  static transformKeys<T extends object>(
    obj: T,
    transformFn: (key: string) => string
  ): Record<string, any> {
    const result: Record<string, any> = {};

    for (const [key, value] of this.entries(obj)) {
      result[transformFn(key as string)] = value;
    }

    return result;
  }

  /**
   * Transforms an object's values
   * @param obj Object to transform
   * @param transformFn Function to transform values
   * @returns New object with transformed values
   */
  static transformValues<T extends object, U>(
    obj: T,
    transformFn: (value: T[keyof T], key: keyof T) => U
  ): Record<keyof T, U> {
    const result = {} as Record<keyof T, U>;

    for (const [key, value] of this.entries(obj)) {
      result[key] = transformFn(value, key);
    }

    return result;
  }

  /**
   * Filters an object's properties
   * @param obj Object to filter
   * @param predicate Function to test each property
   * @returns New object with filtered properties
   */
  static filter<T extends object>(
    obj: T,
    predicate: (value: T[keyof T], key: keyof T) => boolean
  ): Partial<T> {
    const result = {} as Partial<T>;

    for (const [key, value] of this.entries(obj)) {
      if (predicate(value, key)) {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Maps over an object's properties
   * @param obj Object to map over
   * @param mapFn Function to map each property
   * @returns New object with mapped properties
   */
  static map<T extends object, U>(
    obj: T,
    mapFn: (value: T[keyof T], key: keyof T) => U
  ): Record<keyof T, U> {
    const result = {} as Record<keyof T, U>;

    for (const [key, value] of this.entries(obj)) {
      result[key] = mapFn(value, key);
    }

    return result;
  }

  /**
   * Reduces an object to a single value
   * @param obj Object to reduce
   * @param reducer Function to reduce each property
   * @param initialValue Initial value for reduction
   * @returns Reduced value
   */
  static reduce<T extends object, U>(
    obj: T,
    reducer: (acc: U, value: T[keyof T], key: keyof T) => U,
    initialValue: U
  ): U {
    let result = initialValue;

    for (const [key, value] of this.entries(obj)) {
      result = reducer(result, value, key);
    }

    return result;
  }

  /**
   * Inverts an object's keys and values
   * @param obj Object to invert
   * @returns New object with inverted keys and values
   */
  static invert<T extends Record<string, string | number>>(
    obj: T
  ): Record<string, keyof T> {
    const result: Record<string, keyof T> = {};

    for (const [key, value] of this.entries(obj)) {
      result[String(value)] = key;
    }

    return result;
  }

  /**
   * Creates an object from an array using a key function
   * @param arr Array to create object from
   * @param keyFn Function to extract key from each item
   * @returns Object created from array
   */
  static keyBy<T, K extends string | number | symbol>(
    arr: T[],
    keyFn: (item: T) => K
  ): Record<K, T> {
    const result = {} as Record<K, T>;

    for (const item of arr) {
      result[keyFn(item)] = item;
    }

    return result;
  }

  /**
   * Groups an array into an object using a key function
   * @param arr Array to group
   * @param keyFn Function to extract key from each item
   * @returns Object with grouped items
   */
  static groupBy<T, K extends string | number | symbol>(
    arr: T[],
    keyFn: (item: T) => K
  ): Record<K, T[]> {
    const result = {} as Record<K, T[]>;

    for (const item of arr) {
      const key = keyFn(item);
      if (!result[key]) {
        result[key] = [];
      }
      result[key].push(item);
    }

    return result;
  }

  /**
   * Counts occurrences of values in an object
   * @param obj Object to count values in
   * @returns Object with value counts
   */
  static countBy<T extends Record<string, any>>(
    obj: T
  ): Record<string, number> {
    const result: Record<string, number> = {};

    for (const value of this.values(obj)) {
      const key = String(value);
      result[key] = (result[key] || 0) + 1;
    }

    return result;
  }

  /**
   * Flattens a nested object
   * @param obj Object to flatten
   * @param separator Separator for nested keys
   * @returns Flattened object
   */
  static flatten<T extends object>(
    obj: T,
    separator: string = "."
  ): Record<string, any> {
    const result: Record<string, any> = {};

    const flattenRecursive = (current: any, prefix: string = "") => {
      for (const [key, value] of Object.entries(current)) {
        const newKey = prefix ? `${prefix}${separator}${key}` : key;

        if (this.isPlainObject(value)) {
          flattenRecursive(value, newKey);
        } else {
          result[newKey] = value;
        }
      }
    };

    flattenRecursive(obj);
    return result;
  }

  /**
   * Unflattens a flattened object
   * @param obj Flattened object
   * @param separator Separator used for nested keys
   * @returns Unflattened object
   */
  static unflatten<T extends Record<string, any>>(
    obj: T,
    separator: string = "."
  ): Record<string, any> {
    const result: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
      const keys = key.split(separator);
      let current = result;

      for (let i = 0; i < keys.length - 1; i++) {
        const k = keys[i];
        if (!(k in current)) {
          current[k] = {};
        }
        current = current[k];
      }

      current[keys[keys.length - 1]] = value;
    }

    return result;
  }
}
