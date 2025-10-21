/**
 * @module src/domains/scraping/services/company-intelligence.service.ts
 * @description
 * Service for retrieving and analyzing company data, benefits, and statistics.
 */

import { z } from 'zod';
import { CompanyWithStats, CompanyWithStatsSchema, BenefitsSnapshot, BenefitsSnapshotSchema } from '../types';

export interface CompanyEnv {
  DB: D1Database;
}

export class CompanyIntelligenceService {
  private env: CompanyEnv;

  constructor(env: CompanyEnv) {
    this.env = env;
  }

  /**
   * Get a list of companies with their latest stats.
   */
  async getCompanies(options: { limit?: number; offset?: number; query?: string }): Promise<CompanyWithStats[]> {
    const { limit = 25, offset = 0, query } = options;

    let sql = `SELECT c.*, (SELECT json_group_object(...) FROM benefits_stats s ...) AS latest_stats FROM companies c`;
    const params: any[] = [];

    if (query) {
      sql += " WHERE c.name LIKE ? OR c.normalized_domain LIKE ?";
      params.push(`%${query.trim()}%`, `%${query.trim()}%`);
    }
    sql += " ORDER BY c.updated_at DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);

    const { results } = await this.env.DB.prepare(sql).bind(...params).all();
    return z.array(CompanyWithStatsSchema).parse(results || []);
  }

  /**
   * Get benefits snapshots for a specific company.
   */
  async getCompanyBenefits(companyId: string, limit: number = 10): Promise<BenefitsSnapshot[]> {
    const { results } = await this.env.DB.prepare(
      `SELECT * FROM company_benefits_snapshots WHERE company_id = ? ORDER BY extracted_at DESC LIMIT ?`
    ).bind(companyId, limit).all();
    return z.array(BenefitsSnapshotSchema).parse(results || []);
  }

  // Other methods like getBenefitsCompare, getTopHighlights, getValuations would follow a similar pattern...
}