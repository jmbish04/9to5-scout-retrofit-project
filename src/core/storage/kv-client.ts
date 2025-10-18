/**
 * KV Storage utilities for configuration and caching
 */

export interface KVConfig {
  key: string;
  value: string;
  expirationTtl?: number;
  metadata?: Record<string, string>;
}

export class KVStorage {
  constructor(private kv: KVNamespace) {}

  /**
   * Get a value from KV storage
   */
  async get<T = string>(key: string): Promise<T | null> {
    try {
      const value = await this.kv.get(key);
      if (value === null) {
        return null;
      }

      // Try to parse as JSON, fallback to string
      try {
        return JSON.parse(value) as T;
      } catch {
        return value as T;
      }
    } catch (error) {
      console.error(`Error getting KV key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set a value in KV storage
   */
  async set(
    key: string,
    value: unknown,
    options: {
      expirationTtl?: number;
      metadata?: Record<string, string>;
    } = {}
  ): Promise<void> {
    try {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      
      await this.kv.put(key, stringValue, {
        expirationTtl: options.expirationTtl,
        metadata: options.metadata,
      });
    } catch (error) {
      console.error(`Error setting KV key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Delete a value from KV storage
   */
  async delete(key: string): Promise<void> {
    try {
      await this.kv.delete(key);
    } catch (error) {
      console.error(`Error deleting KV key ${key}:`, error);
      throw error;
    }
  }

  /**
   * List keys with optional prefix
   */
  async listKeys(prefix?: string, limit?: number): Promise<string[]> {
    try {
      const result = await this.kv.list({
        prefix,
        limit,
      });
      return result.keys.map(key => key.name);
    } catch (error) {
      console.error(`Error listing KV keys with prefix ${prefix}:`, error);
      return [];
    }
  }

  /**
   * Get multiple values at once
   */
  async getMany<T = string>(keys: string[]): Promise<Record<string, T | null>> {
    const results: Record<string, T | null> = {};
    
    await Promise.all(
      keys.map(async (key) => {
        results[key] = await this.get<T>(key);
      })
    );

    return results;
  }

  /**
   * Set multiple values at once
   */
  async setMany(
    entries: Array<{
      key: string;
      value: unknown;
      options?: {
        expirationTtl?: number;
        metadata?: Record<string, string>;
      };
    }>
  ): Promise<void> {
    await Promise.all(
      entries.map(({ key, value, options }) =>
        this.set(key, value, options || {})
      )
    );
  }

  /**
   * Get configuration value with type safety
   */
  async getConfig<T = string>(configKey: string): Promise<T | null> {
    return this.get<T>(`config:${configKey}`);
  }

  /**
   * Set configuration value
   */
  async setConfig(
    configKey: string,
    value: unknown,
    options?: {
      expirationTtl?: number;
      metadata?: Record<string, string>;
    }
  ): Promise<void> {
    return this.set(`config:${configKey}`, value, options);
  }

  /**
   * Cache a value with automatic expiration
   */
  async cache<T = string>(
    key: string,
    value: unknown,
    ttlSeconds: number = 3600
  ): Promise<void> {
    return this.set(`cache:${key}`, value, {
      expirationTtl: ttlSeconds,
    });
  }

  /**
   * Get cached value
   */
  async getCached<T = string>(key: string): Promise<T | null> {
    return this.get<T>(`cache:${key}`);
  }

  /**
   * Clear cache by prefix
   */
  async clearCache(prefix: string = ''): Promise<number> {
    const keys = await this.listKeys(`cache:${prefix}`);
    let deletedCount = 0;

    await Promise.all(
      keys.map(async (key) => {
        try {
          await this.delete(key);
          deletedCount++;
        } catch (error) {
          console.error(`Error deleting cache key ${key}:`, error);
        }
      })
    );

    return deletedCount;
  }
}
