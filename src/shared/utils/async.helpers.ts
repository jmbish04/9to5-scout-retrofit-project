/**
 * @fileoverview Async Helper Utilities
 *
 * Utility functions for asynchronous operations, promises, and concurrency
 * across all domains in the 9to5 Scout platform.
 *
 * @author 9to5 Scout AI Team
 * @version 1.0.0
 * @since 2024-01-01
 */

/**
 * Async utility functions
 */
export class AsyncUtils {
  /**
   * Creates a promise that resolves after a specified delay
   * @param ms Delay in milliseconds
   * @returns Promise that resolves after delay
   */
  static delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Creates a promise that rejects after a specified timeout
   * @param promise Promise to timeout
   * @param ms Timeout in milliseconds
   * @param errorMessage Error message for timeout
   * @returns Promise that rejects on timeout
   */
  static timeout<T>(
    promise: Promise<T>,
    ms: number,
    errorMessage: string = "Operation timed out"
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(errorMessage)), ms)
      ),
    ]);
  }

  /**
   * Retries a promise-returning function with exponential backoff
   * @param fn Function to retry
   * @param options Retry options
   * @returns Promise that resolves with function result
   */
  static retry<T>(
    fn: () => Promise<T>,
    options: {
      maxRetries?: number;
      baseDelay?: number;
      maxDelay?: number;
      backoffFactor?: number;
      retryCondition?: (error: Error) => boolean;
    } = {}
  ): Promise<T> {
    const {
      maxRetries = 3,
      baseDelay = 1000,
      maxDelay = 10000,
      backoffFactor = 2,
      retryCondition = () => true,
    } = options;

    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt === maxRetries || !retryCondition(lastError)) {
          throw lastError;
        }

        const delay = Math.min(
          baseDelay * Math.pow(backoffFactor, attempt),
          maxDelay
        );

        await this.delay(delay);
      }
    }

    throw lastError!;
  }

  /**
   * Executes promises in parallel with a concurrency limit
   * @param promises Array of promise-returning functions
   * @param concurrency Maximum number of concurrent executions
   * @returns Promise that resolves with array of results
   */
  static parallelLimit<T>(
    promises: Array<() => Promise<T>>,
    concurrency: number
  ): Promise<T[]> {
    return new Promise((resolve, reject) => {
      const results: T[] = [];
      let running = 0;
      let index = 0;
      let completed = 0;

      const executeNext = async () => {
        if (index >= promises.length) return;

        const currentIndex = index++;
        running++;

        try {
          const result = await promises[currentIndex]();
          results[currentIndex] = result;
          completed++;

          if (completed === promises.length) {
            resolve(results);
          } else {
            running--;
            executeNext();
          }
        } catch (error) {
          reject(error);
        }
      };

      // Start initial batch
      for (let i = 0; i < Math.min(concurrency, promises.length); i++) {
        executeNext();
      }
    });
  }

  /**
   * Executes promises sequentially
   * @param promises Array of promise-returning functions
   * @returns Promise that resolves with array of results
   */
  static sequential<T>(promises: Array<() => Promise<T>>): Promise<T[]> {
    return promises.reduce(async (acc, promise) => {
      const results = await acc;
      const result = await promise();
      return [...results, result];
    }, Promise.resolve([] as T[]));
  }

  /**
   * Executes promises in batches
   * @param promises Array of promise-returning functions
   * @param batchSize Size of each batch
   * @returns Promise that resolves with array of results
   */
  static batch<T>(
    promises: Array<() => Promise<T>>,
    batchSize: number
  ): Promise<T[]> {
    const batches: Array<Array<() => Promise<T>>> = [];

    for (let i = 0; i < promises.length; i += batchSize) {
      batches.push(promises.slice(i, i + batchSize));
    }

    return batches.reduce(async (acc, batch) => {
      const results = await acc;
      const batchResults = await Promise.all(batch.map((fn) => fn()));
      return [...results, ...batchResults];
    }, Promise.resolve([] as T[]));
  }

  /**
   * Executes promises with a delay between each
   * @param promises Array of promise-returning functions
   * @param delayMs Delay between executions in milliseconds
   * @returns Promise that resolves with array of results
   */
  static withDelay<T>(
    promises: Array<() => Promise<T>>,
    delayMs: number
  ): Promise<T[]> {
    return promises.reduce(async (acc, promise, index) => {
      const results = await acc;

      if (index > 0) {
        await this.delay(delayMs);
      }

      const result = await promise();
      return [...results, result];
    }, Promise.resolve([] as T[]));
  }

  /**
   * Creates a promise that resolves or rejects based on a condition
   * @param condition Condition to check
   * @param resolveValue Value to resolve with if condition is true
   * @param rejectValue Value to reject with if condition is false
   * @returns Promise that resolves or rejects based on condition
   */
  static conditional<T, U>(
    condition: boolean,
    resolveValue: T,
    rejectValue: U
  ): Promise<T> {
    return condition
      ? Promise.resolve(resolveValue)
      : Promise.reject(rejectValue);
  }

  /**
   * Creates a promise that resolves with the first successful result
   * @param promises Array of promise-returning functions
   * @returns Promise that resolves with first successful result
   */
  static firstSuccess<T>(promises: Array<() => Promise<T>>): Promise<T> {
    return new Promise((resolve, reject) => {
      let completed = 0;
      const errors: Error[] = [];

      for (const promise of promises) {
        promise()
          .then(resolve)
          .catch((error) => {
            errors.push(
              error instanceof Error ? error : new Error(String(error))
            );
            completed++;

            if (completed === promises.length) {
              reject(
                new Error(
                  `All promises failed: ${errors
                    .map((e) => e.message)
                    .join(", ")}`
                )
              );
            }
          });
      }
    });
  }

  /**
   * Creates a promise that resolves with all successful results
   * @param promises Array of promise-returning functions
   * @returns Promise that resolves with array of successful results
   */
  static allSettled<T>(promises: Array<() => Promise<T>>): Promise<T[]> {
    return Promise.allSettled(promises.map((fn) => fn())).then((results) =>
      results
        .filter(
          (result): result is PromiseFulfilledResult<T> =>
            result.status === "fulfilled"
        )
        .map((result) => result.value)
    );
  }

  /**
   * Creates a promise that resolves with the first result (success or failure)
   * @param promises Array of promise-returning functions
   * @returns Promise that resolves with first result
   */
  static race<T>(promises: Array<() => Promise<T>>): Promise<T> {
    return Promise.race(promises.map((fn) => fn()));
  }

  /**
   * Creates a promise that resolves after all promises complete (success or failure)
   * @param promises Array of promise-returning functions
   * @returns Promise that resolves with array of results
   */
  static allSettledResults<T>(
    promises: Array<() => Promise<T>>
  ): Promise<Array<{ success: boolean; result?: T; error?: Error }>> {
    return Promise.allSettled(promises.map((fn) => fn())).then((results) =>
      results.map((result) => ({
        success: result.status === "fulfilled",
        result: result.status === "fulfilled" ? result.value : undefined,
        error:
          result.status === "rejected"
            ? result.reason instanceof Error
              ? result.reason
              : new Error(String(result.reason))
            : undefined,
      }))
    );
  }

  /**
   * Creates a promise that resolves with a default value if the original promise rejects
   * @param promise Promise to wrap
   * @param defaultValue Default value to return on rejection
   * @returns Promise that resolves with result or default value
   */
  static withDefault<T>(promise: Promise<T>, defaultValue: T): Promise<T> {
    return promise.catch(() => defaultValue);
  }

  /**
   * Creates a promise that resolves with a fallback value if the original promise rejects
   * @param promise Promise to wrap
   * @param fallbackFn Function to call for fallback value
   * @returns Promise that resolves with result or fallback value
   */
  static withFallback<T>(
    promise: Promise<T>,
    fallbackFn: () => T | Promise<T>
  ): Promise<T> {
    return promise.catch(() => fallbackFn());
  }

  /**
   * Creates a promise that resolves with a transformed value if the original promise rejects
   * @param promise Promise to wrap
   * @param transformFn Function to transform the error
   * @returns Promise that resolves with result or transformed value
   */
  static withTransform<T>(
    promise: Promise<T>,
    transformFn: (error: Error) => T | Promise<T>
  ): Promise<T> {
    return promise.catch((error) =>
      transformFn(error instanceof Error ? error : new Error(String(error)))
    );
  }

  /**
   * Creates a promise that resolves with a cached value if available
   * @param key Cache key
   * @param fn Function to execute if not cached
   * @param cache Map to use as cache
   * @returns Promise that resolves with cached or computed value
   */
  static withCache<T>(
    key: string,
    fn: () => Promise<T>,
    cache: Map<string, T> = new Map()
  ): Promise<T> {
    if (cache.has(key)) {
      return Promise.resolve(cache.get(key)!);
    }

    return fn().then((result) => {
      cache.set(key, result);
      return result;
    });
  }

  /**
   * Creates a promise that resolves with a debounced value
   * @param fn Function to debounce
   * @param delayMs Delay in milliseconds
   * @returns Promise that resolves with debounced result
   */
  static debounce<T>(fn: () => Promise<T>, delayMs: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, delayMs);

      // Store timeout ID for potential cancellation
      (fn as any).__timeoutId = timeoutId;
    });
  }

  /**
   * Creates a promise that resolves with a throttled value
   * @param fn Function to throttle
   * @param delayMs Delay in milliseconds
   * @returns Promise that resolves with throttled result
   */
  static throttle<T>(fn: () => Promise<T>, delayMs: number): Promise<T> {
    const lastCall = { time: 0, result: null as T | null };

    return new Promise((resolve, reject) => {
      const now = Date.now();

      if (now - lastCall.time >= delayMs) {
        lastCall.time = now;
        fn()
          .then((result) => {
            lastCall.result = result;
            resolve(result);
          })
          .catch(reject);
      } else {
        if (lastCall.result !== null) {
          resolve(lastCall.result);
        } else {
          reject(new Error("Throttled function not yet executed"));
        }
      }
    });
  }

  /**
   * Creates a promise that resolves with a memoized value
   * @param fn Function to memoize
   * @param keyFn Function to generate cache key
   * @param cache Map to use as cache
   * @returns Promise that resolves with memoized result
   */
  static memoize<T, K>(
    fn: () => Promise<T>,
    keyFn: () => K,
    cache: Map<K, T> = new Map()
  ): Promise<T> {
    const key = keyFn();

    if (cache.has(key)) {
      return Promise.resolve(cache.get(key)!);
    }

    return fn().then((result) => {
      cache.set(key, result);
      return result;
    });
  }

  /**
   * Creates a promise that resolves with a retried value
   * @param fn Function to retry
   * @param maxRetries Maximum number of retries
   * @param delayMs Delay between retries
   * @returns Promise that resolves with retried result
   */
  static retryWithDelay<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    delayMs: number = 1000
  ): Promise<T> {
    return this.retry(fn, {
      maxRetries,
      baseDelay: delayMs,
      backoffFactor: 1,
    });
  }

  /**
   * Creates a promise that resolves with a timeout value
   * @param fn Function to execute
   * @param timeoutMs Timeout in milliseconds
   * @returns Promise that resolves with timeout result
   */
  static withTimeout<T>(fn: () => Promise<T>, timeoutMs: number): Promise<T> {
    return this.timeout(fn(), timeoutMs);
  }

  /**
   * Creates a promise that resolves with a delayed value
   * @param fn Function to execute
   * @param delayMs Delay in milliseconds
   * @returns Promise that resolves with delayed result
   */
  static withDelay<T>(fn: () => Promise<T>, delayMs: number): Promise<T> {
    return this.delay(delayMs).then(() => fn());
  }
}
