/**
 * Company Storage Service
 *
 * Service for managing company data storage and retrieval operations.
 * Handles CRUD operations for companies, research, and benefits data.
 */

import type { Env } from "../../../config/env";
import type {
  Company,
  CompanyResearch,
  CompanySnapshot,
  CompanyStats,
  CreateCompanyRequest,
  UpdateCompanyRequest,
  CompanySearchRequest,
  CompanySearchResponse,
} from "../types/company.types";

export class CompanyStorageService {
  constructor(private env: Env) {}

  /**
   * Create a new company
   */
  async createCompany(request: CreateCompanyRequest): Promise<Company> {
    const companyId = crypto.randomUUID();
    const now = new Date().toISOString();

    const company: Company = {
      id: companyId,
      name: request.name,
      normalized_domain: request.normalized_domain,
      website_url: request.website_url,
      careers_url: request.careers_url,
      description: request.description,
      industry: request.industry,
      size: request.size,
      location: request.location,
      founded: request.founded,
      mission: request.mission,
      company_values: request.company_values,
      last_updated: now,
      research_count: 0,
      created_at: now,
      updated_at: now,
    };

    await this.env.DB.prepare(`
      INSERT INTO companies (
        id, name, normalized_domain, website_url, careers_url, description,
        industry, size, location, founded, mission, company_values,
        last_updated, research_count, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      company.id,
      company.name,
      company.normalized_domain,
      company.website_url,
      company.careers_url,
      company.description,
      company.industry,
      company.size,
      company.location,
      company.founded,
      company.mission,
      company.company_values ? JSON.stringify(company.company_values) : null,
      company.last_updated,
      company.research_count,
      company.created_at,
      company.updated_at,
    ).run();

    return company;
  }

  /**
   * Get a company by ID
   */
  async getCompany(companyId: string): Promise<Company | null> {
    const result = await this.env.DB.prepare(`
      SELECT * FROM companies WHERE id = ?
    `).bind(companyId).first();

    if (!result) {
      return null;
    }

    return this.mapDbRowToCompany(result);
  }

  /**
   * Update a company
   */
  async updateCompany(companyId: string, updates: UpdateCompanyRequest): Promise<Company | null> {
    const company = await this.getCompany(companyId);
    if (!company) {
      return null;
    }

    const updatedCompany = {
      ...company,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    await this.env.DB.prepare(`
      UPDATE companies 
      SET name = ?, normalized_domain = ?, website_url = ?, careers_url = ?,
          description = ?, industry = ?, size = ?, location = ?, founded = ?,
          mission = ?, company_values = ?, culture = ?, recent_news = ?,
          financials = ?, leadership = ?, benefits = ?, interview_insights = ?,
          updated_at = ?
      WHERE id = ?
    `).bind(
      updatedCompany.name,
      updatedCompany.normalized_domain,
      updatedCompany.website_url,
      updatedCompany.careers_url,
      updatedCompany.description,
      updatedCompany.industry,
      updatedCompany.size,
      updatedCompany.location,
      updatedCompany.founded,
      updatedCompany.mission,
      updatedCompany.company_values ? JSON.stringify(updatedCompany.company_values) : null,
      updatedCompany.culture ? JSON.stringify(updatedCompany.culture) : null,
      updatedCompany.recent_news ? JSON.stringify(updatedCompany.recent_news) : null,
      updatedCompany.financials ? JSON.stringify(updatedCompany.financials) : null,
      updatedCompany.leadership ? JSON.stringify(updatedCompany.leadership) : null,
      updatedCompany.benefits ? JSON.stringify(updatedCompany.benefits) : null,
      updatedCompany.interview_insights ? JSON.stringify(updatedCompany.interview_insights) : null,
      updatedCompany.updated_at,
      companyId,
    ).run();

    return updatedCompany;
  }

  /**
   * Delete a company
   */
  async deleteCompany(companyId: string): Promise<boolean> {
    const result = await this.env.DB.prepare(`
      DELETE FROM companies WHERE id = ?
    `).bind(companyId).run();

    return result.changes > 0;
  }

  /**
   * Search companies
   */
  async searchCompanies(request: CompanySearchRequest): Promise<CompanySearchResponse> {
    const page = Math.max(1, request.offset ? Math.floor(request.offset / (request.limit || 25)) + 1 : 1);
    const limit = request.limit || 25;
    const offset = (page - 1) * limit;

    let whereClause = "WHERE 1=1";
    const params: any[] = [];

    if (request.query) {
      whereClause += " AND (name LIKE ? OR normalized_domain LIKE ?)";
      params.push(`%${request.query}%`, `%${request.query}%`);
    }

    if (request.industry) {
      whereClause += " AND industry = ?";
      params.push(request.industry);
    }

    if (request.size) {
      whereClause += " AND size = ?";
      params.push(request.size);
    }

    if (request.location) {
      whereClause += " AND location LIKE ?";
      params.push(`%${request.location}%`);
    }

    // Get total count
    const countResult = await this.env.DB.prepare(`
      SELECT COUNT(*) as total FROM companies ${whereClause}
    `).bind(...params).first();

    const total = (countResult as { total: number }).total;

    // Get companies
    const companies = await this.env.DB.prepare(`
      SELECT * FROM companies 
      ${whereClause}
      ORDER BY updated_at DESC
      LIMIT ? OFFSET ?
    `).bind(...params, limit, offset).all();

    const companyList = (companies || []).map((row: any) => this.mapDbRowToCompany(row));

    return {
      companies: companyList,
      total,
      page,
      limit,
      has_more: offset + limit < total,
    };
  }

  /**
   * List companies with pagination
   */
  async listCompanies(page: number = 1, limit: number = 25): Promise<CompanySearchResponse> {
    const offset = (page - 1) * limit;

    // Get total count
    const countResult = await this.env.DB.prepare(`
      SELECT COUNT(*) as total FROM companies
    `).first();

    const total = (countResult as { total: number }).total;

    // Get companies
    const companies = await this.env.DB.prepare(`
      SELECT * FROM companies 
      ORDER BY updated_at DESC
      LIMIT ? OFFSET ?
    `).bind(limit, offset).all();

    const companyList = (companies || []).map((row: any) => this.mapDbRowToCompany(row));

    return {
      companies: companyList,
      total,
      page,
      limit,
      has_more: offset + limit < total,
    };
  }

  /**
   * Create company research
   */
  async createCompanyResearch(companyName: string, domain?: string, industry?: string): Promise<CompanyResearch> {
    const researchId = crypto.randomUUID();
    const now = new Date().toISOString();

    const research: CompanyResearch = {
      id: researchId,
      company_name: companyName,
      domain,
      industry,
      status: "queued",
      created_at: now,
      updated_at: now,
    };

    await this.env.DB.prepare(`
      INSERT INTO company_research (
        id, company_name, domain, industry, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      research.id,
      research.company_name,
      research.domain,
      research.industry,
      research.status,
      research.created_at,
      research.updated_at,
    ).run();

    return research;
  }

  /**
   * Update company research status
   */
  async updateCompanyResearchStatus(researchId: string, status: CompanyResearch["status"]): Promise<void> {
    await this.env.DB.prepare(`
      UPDATE company_research 
      SET status = ?, updated_at = ?
      WHERE id = ?
    `).bind(status, new Date().toISOString(), researchId).run();
  }

  /**
   * Get company research by ID
   */
  async getCompanyResearch(researchId: string): Promise<CompanyResearch | null> {
    const result = await this.env.DB.prepare(`
      SELECT * FROM company_research WHERE id = ?
    `).bind(researchId).first();

    if (!result) {
      return null;
    }

    return {
      id: result.id as string,
      company_name: result.company_name as string,
      domain: result.domain as string | undefined,
      industry: result.industry as string | undefined,
      status: result.status as CompanyResearch["status"],
      created_at: result.created_at as string,
      updated_at: result.updated_at as string,
    };
  }

  /**
   * Create company snapshot
   */
  async createCompanySnapshot(snapshot: Omit<CompanySnapshot, "id">): Promise<CompanySnapshot> {
    const snapshotId = crypto.randomUUID();
    const fullSnapshot: CompanySnapshot = {
      ...snapshot,
      id: snapshotId,
    };

    await this.env.DB.prepare(`
      INSERT INTO company_benefits_snapshots (
        id, company_id, source, source_url, snapshot_text, parsed, extracted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      fullSnapshot.id,
      fullSnapshot.company_id,
      fullSnapshot.source,
      fullSnapshot.source_url,
      fullSnapshot.snapshot_text,
      fullSnapshot.parsed ? JSON.stringify(fullSnapshot.parsed) : null,
      fullSnapshot.extracted_at,
    ).run();

    return fullSnapshot;
  }

  /**
   * Get company snapshots
   */
  async getCompanySnapshots(companyId: string, limit: number = 10): Promise<CompanySnapshot[]> {
    const result = await this.env.DB.prepare(`
      SELECT * FROM company_benefits_snapshots 
      WHERE company_id = ?
      ORDER BY extracted_at DESC
      LIMIT ?
    `).bind(companyId, limit).all();

    return (result || []).map((row: any) => ({
      id: row.id,
      company_id: row.company_id,
      source: row.source,
      source_url: row.source_url,
      snapshot_text: row.snapshot_text,
      parsed: row.parsed ? JSON.parse(row.parsed) : undefined,
      extracted_at: row.extracted_at,
    }));
  }

  /**
   * Get company stats
   */
  async getCompanyStats(companyId: string): Promise<CompanyStats | null> {
    const result = await this.env.DB.prepare(`
      SELECT * FROM benefits_stats 
      WHERE company_id = ?
      ORDER BY computed_at DESC
      LIMIT 1
    `).bind(companyId).first();

    if (!result) {
      return null;
    }

    return {
      company_id: result.company_id as string,
      highlights: result.highlights ? JSON.parse(result.highlights) : [],
      total_comp_heuristics: result.total_comp_heuristics ? JSON.parse(result.total_comp_heuristics) : null,
      coverage: result.coverage ? JSON.parse(result.coverage) : null,
      computed_at: result.computed_at as string,
    };
  }

  /**
   * Map database row to Company object
   */
  private mapDbRowToCompany(row: any): Company {
    return {
      id: row.id,
      name: row.name,
      normalized_domain: row.normalized_domain,
      website_url: row.website_url,
      careers_url: row.careers_url,
      description: row.description,
      industry: row.industry,
      size: row.size,
      location: row.location,
      founded: row.founded,
      mission: row.mission,
      company_values: row.company_values ? JSON.parse(row.company_values) : undefined,
      culture: row.culture ? JSON.parse(row.culture) : undefined,
      recent_news: row.recent_news ? JSON.parse(row.recent_news) : undefined,
      financials: row.financials ? JSON.parse(row.financials) : undefined,
      leadership: row.leadership ? JSON.parse(row.leadership) : undefined,
      benefits: row.benefits ? JSON.parse(row.benefits) : undefined,
      interview_insights: row.interview_insights ? JSON.parse(row.interview_insights) : undefined,
      last_updated: row.last_updated,
      research_count: row.research_count,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}

/**
 * Factory function to create a CompanyStorageService instance
 */
export function createCompanyStorageService(env: Env): CompanyStorageService {
  return new CompanyStorageService(env);
}
