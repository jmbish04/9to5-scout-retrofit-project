/**
 * @module src/domains/config/services/config.service.ts
 * @description
 * Service for managing search configurations and other application settings.
 */

import { z } from 'zod';
import { NotFoundError, DatabaseError } from '../../../core/errors';

// Assuming a SearchConfig type is defined in types.ts
type SearchConfig = any;

export interface ConfigEnv {
  DB: D1Database;
}

export class ConfigService {
  private env: ConfigEnv;

  constructor(env: ConfigEnv) {
    this.env = env;
  }

  async getSearchConfigs(): Promise<SearchConfig[]> {
    try {
      const { results } = await this.env.DB.prepare("SELECT * FROM search_configs").all();
      return results || [];
    } catch (error) {
      throw new DatabaseError("Failed to get search configs", error as Error);
    }
  }

  async getSearchConfigById(id: string): Promise<SearchConfig> {
    try {
      const config = await this.env.DB.prepare("SELECT * FROM search_configs WHERE id = ?").bind(id).first();
      if (!config) {
        throw new NotFoundError("SearchConfig", id);
      }
      return config;
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      throw new DatabaseError(`Failed to get search config with id ${id}`, error as Error);
    }
  }

  async saveSearchConfig(config: SearchConfig): Promise<string> {
    try {
      const { id, name, keywords, locations, include_domains, exclude_domains, min_comp_total } = config;
      await this.env.DB.prepare(
        `INSERT OR REPLACE INTO search_configs (id, name, keywords, locations, include_domains, exclude_domains, min_comp_total)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).bind(id, name, keywords, locations, include_domains, exclude_domains, min_comp_total).run();
      return id;
    } catch (error) {
      throw new DatabaseError("Failed to save search config", error as Error);
    }
  }

  async deleteSearchConfig(id: string): Promise<void> {
    try {
      const { success } = await this.env.DB.prepare("DELETE FROM search_configs WHERE id = ?").bind(id).run();
      if (!success) {
        throw new DatabaseError(`Failed to delete search config with id ${id}`);
      }
    } catch (error) {
      throw new DatabaseError(`Failed to delete search config with id ${id}`, error as Error);
    }
  }
}
