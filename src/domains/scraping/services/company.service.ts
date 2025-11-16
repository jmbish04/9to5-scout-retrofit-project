/**
 * @module src/domains/scraping/services/company.service.ts
 * @description
 * Service for managing company records in the database.
 */

import { z } from "zod";

export const CompanySchema = z.object({
  id: z.string(),
  name: z.string(),
  normalized_domain: z.string(),
  website_url: z.string().url().nullable().optional(),
  careers_url: z.string().url().nullable().optional(),
  description: z.string().nullable().optional(),
  created_at: z.number(),
  updated_at: z.number(),
});

export const CreateCompanySchema = z.object({
  name: z.string().min(1),
  normalized_domain: z.string().min(1),
  website_url: z.string().url().optional(),
  careers_url: z.string().url().optional(),
  description: z.string().optional(),
});

export const UpdateCompanySchema = CreateCompanySchema.partial();

export type Company = z.infer<typeof CompanySchema>;
export type CreateCompanyInput = z.infer<typeof CreateCompanySchema>;
export type UpdateCompanyInput = z.infer<typeof UpdateCompanySchema>;

export interface CompanyEnv {
  DB: D1Database;
}

export class CompanyService {
  private env: CompanyEnv;

  constructor(env: CompanyEnv) {
    this.env = env;
  }

  /**
   * Get all companies with optional filtering and pagination.
   */
  async getCompanies(options: {
    limit?: number;
    offset?: number;
    query?: string;
  }): Promise<Company[]> {
    const { limit = 25, offset = 0, query } = options;

    let sql = `SELECT * FROM companies`;
    const params: any[] = [];

    if (query) {
      sql += ` WHERE name LIKE ? OR normalized_domain LIKE ?`;
      params.push(`%${query.trim()}%`, `%${query.trim()}%`);
    }

    sql += ` ORDER BY updated_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const { results } = await this.env.DB.prepare(sql)
      .bind(...params)
      .all();
    return z.array(CompanySchema).parse(results || []);
  }

  /**
   * Get a single company by ID.
   */
  async getCompany(id: string): Promise<Company | null> {
    const { results } = await this.env.DB.prepare(
      `SELECT * FROM companies WHERE id = ?`
    )
      .bind(id)
      .all();

    if (!results || results.length === 0) {
      return null;
    }

    return CompanySchema.parse(results[0]);
  }

  /**
   * Get a company by normalized domain.
   */
  async getCompanyByDomain(normalizedDomain: string): Promise<Company | null> {
    const { results } = await this.env.DB.prepare(
      `SELECT * FROM companies WHERE normalized_domain = ?`
    )
      .bind(normalizedDomain)
      .all();

    if (!results || results.length === 0) {
      return null;
    }

    return CompanySchema.parse(results[0]);
  }

  /**
   * Create a new company.
   */
  async createCompany(input: CreateCompanyInput): Promise<Company> {
    const validatedInput = CreateCompanySchema.parse(input);

    // Check if domain already exists
    const existing = await this.getCompanyByDomain(
      validatedInput.normalized_domain
    );
    if (existing) {
      throw new Error(
        `Company with domain ${validatedInput.normalized_domain} already exists`
      );
    }

    const now = Date.now();
    const id = crypto.randomUUID();

    const { results } = await this.env.DB.prepare(
      `INSERT INTO companies (id, name, normalized_domain, website_url, careers_url, description, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        id,
        validatedInput.name,
        validatedInput.normalized_domain,
        validatedInput.website_url || null,
        validatedInput.careers_url || null,
        validatedInput.description || null,
        now,
        now
      )
      .run();

    const company = await this.getCompany(id);
    if (!company) {
      throw new Error(`Failed to retrieve company after creation: ${id}`);
    }
    return company;
  }

  /**
   * Update an existing company.
   */
  async updateCompany(
    id: string,
    input: UpdateCompanyInput
  ): Promise<Company | null> {
    const validatedInput = UpdateCompanySchema.parse(input);

    // Check if company exists
    const existing = await this.getCompany(id);
    if (!existing) {
      return null;
    }

    // Check if domain change conflicts with existing company
    if (
      validatedInput.normalized_domain &&
      validatedInput.normalized_domain !== existing.normalized_domain
    ) {
      const domainConflict = await this.getCompanyByDomain(
        validatedInput.normalized_domain
      );
      if (domainConflict && domainConflict.id !== id) {
        throw new Error(
          `Company with domain ${validatedInput.normalized_domain} already exists`
        );
      }
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (validatedInput.name !== undefined) {
      updates.push("name = ?");
      params.push(validatedInput.name);
    }

    if (validatedInput.normalized_domain !== undefined) {
      updates.push("normalized_domain = ?");
      params.push(validatedInput.normalized_domain);
    }

    if (validatedInput.website_url !== undefined) {
      updates.push("website_url = ?");
      params.push(validatedInput.website_url);
    }

    if (validatedInput.careers_url !== undefined) {
      updates.push("careers_url = ?");
      params.push(validatedInput.careers_url);
    }

    if (validatedInput.description !== undefined) {
      updates.push("description = ?");
      params.push(validatedInput.description);
    }

    if (updates.length === 0) {
      return existing; // No changes
    }

    updates.push("updated_at = ?");
    params.push(Date.now());
    params.push(id);

    await this.env.DB.prepare(
      `UPDATE companies SET ${updates.join(", ")} WHERE id = ?`
    )
      .bind(...params)
      .run();

    return this.getCompany(id);
  }

  /**
   * Delete a company.
   */
  async deleteCompany(id: string): Promise<boolean> {
    const { meta } = await this.env.DB.prepare(
      `DELETE FROM companies WHERE id = ?`
    )
      .bind(id)
      .run();

    return meta.changes > 0;
  }

  /**
   * Get companies that have careers URLs configured.
   */
  async getCompaniesWithCareersUrls(): Promise<Company[]> {
    const { results } = await this.env.DB.prepare(
      `SELECT * FROM companies WHERE careers_url IS NOT NULL AND careers_url != '' ORDER BY updated_at DESC`
    ).all();

    return z.array(CompanySchema).parse(results || []);
  }
}
