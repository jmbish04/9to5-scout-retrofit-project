/**
 * Stats Domain Services
 *
 * Business logic services for statistics computation, analysis, and reporting.
 * Provides comprehensive statistical analysis capabilities for benefits data,
 * company metrics, and performance reporting within the 9to5 Scout application.
 *
 * @fileoverview This module contains the core business logic for statistical
 * analysis including benefits rollup, company statistics, and reporting services.
 */

import {
  CompanyStatsModel,
  StatsComputationModel,
} from "../models/stats.model";
import type {
  CompanyStats,
  RollupOptions,
  StatsComputationResult,
  StatsContext,
  StatsEnv,
  StatsServiceConfig,
  StatsValidationResult,
  TopHighlightsResult,
  ValuationsResult,
} from "../types/stats.types";

/**
 * Statistics computation service
 *
 * @description Handles the core business logic for computing statistics
 * from company benefits data and managing statistical analysis workflows.
 */
export class StatsComputationService {
  private config: StatsServiceConfig;

  constructor(
    config: StatsServiceConfig = {
      defaultMonths: 6,
      maxCompaniesPerBatch: 100,
      enableDryRun: false,
    }
  ) {
    this.config = config;
  }

  /**
   * Perform benefits statistics rollup
   *
   * @param env - Cloudflare Workers environment bindings
   * @param options - Rollup configuration options
   * @returns Statistics computation result with processed count
   *
   * @description Computes statistics for company benefits data over a specified
   * time period, processing snapshots and generating insights for each company.
   *
   * @example
   * ```typescript
   * const service = new StatsComputationService();
   * const result = await service.benefitsStatsRollup(env, { months: 6 });
   * console.log(`Processed ${result.processed} companies`);
   * ```
   */
  async benefitsStatsRollup(
    env: StatsEnv,
    options: RollupOptions = {}
  ): Promise<StatsComputationResult> {
    const months = options.months ?? this.config.defaultMonths;
    const cutoff = Date.now() - months * 30 * 24 * 60 * 60 * 1000;
    const params: any[] = [];
    let companyQuery = "SELECT id FROM companies";

    if (options.companyId) {
      companyQuery += " WHERE id = ?";
      params.push(options.companyId);
    }

    const companiesResult = await env.DB.prepare(companyQuery)
      .bind(...params)
      .all();
    const companies = (companiesResult.results || []) as { id: string }[];
    let processed = 0;

    for (const row of companies) {
      const snapshotsResult = await env.DB.prepare(
        `SELECT parsed, extracted_at, source
         FROM company_benefits_snapshots
         WHERE company_id = ? AND extracted_at >= ?
         ORDER BY extracted_at DESC`
      )
        .bind(row.id, cutoff)
        .all();

      const snapshotsRaw = (snapshotsResult.results || []) as any[];
      if (!snapshotsRaw.length) {
        continue;
      }

      const parsedSnapshots = snapshotsRaw
        .map((snapshot) => StatsComputationModel.parseSnapshot(snapshot))
        .filter(Boolean);

      if (!parsedSnapshots.length) {
        continue;
      }

      const stats = StatsComputationModel.computeStats(parsedSnapshots);
      processed += 1;

      if (options.dryRun) {
        console.log(
          "[DRY_RUN] Would store benefits stats for company",
          row.id,
          stats
        );
        continue;
      }

      await env.DB.prepare(
        `INSERT INTO benefits_stats (company_id, computed_at, highlights, total_comp_heuristics, coverage)
         VALUES (?, ?, ?, ?, ?)`
      )
        .bind(
          row.id,
          Date.now(),
          JSON.stringify(stats.highlights),
          JSON.stringify(stats.total_comp_heuristics),
          JSON.stringify(stats.coverage)
        )
        .run();
    }

    return { processed };
  }

  /**
   * Get latest statistics for a specific company
   *
   * @param env - Cloudflare Workers environment bindings
   * @param companyId - Company identifier
   * @returns Latest company statistics or null if not found
   *
   * @description Retrieves the most recent computed statistics for a specific
   * company, including highlights, coverage, and total compensation data.
   *
   * @example
   * ```typescript
   * const service = new StatsComputationService();
   * const stats = await service.getLatestStatsForCompany(env, 'company-123');
   * if (stats) {
   *   console.log(stats.highlights?.standout);
   * }
   * ```
   */
  async getLatestStatsForCompany(
    env: StatsEnv,
    companyId: string
  ): Promise<CompanyStats | null> {
    const result = await env.DB.prepare(
      `SELECT highlights, total_comp_heuristics, coverage, computed_at
       FROM benefits_stats
       WHERE company_id = ?
       ORDER BY computed_at DESC
       LIMIT 1`
    )
      .bind(companyId)
      .first();

    if (!result) {
      return null;
    }

    return CompanyStatsModel.fromDbRow({
      company_id: companyId,
      ...result,
    });
  }

  /**
   * Get top highlights across all companies
   *
   * @param env - Cloudflare Workers environment bindings
   * @param limit - Maximum number of results to return
   * @returns Array of top highlights results
   *
   * @description Retrieves the most recent highlights data from all companies,
   * sorted by computation date, for cross-company analysis and reporting.
   *
   * @example
   * ```typescript
   * const service = new StatsComputationService();
   * const highlights = await service.getTopHighlights(env, 10);
   * console.log(highlights[0].highlights?.standout);
   * ```
   */
  async getTopHighlights(
    env: StatsEnv,
    limit = 10
  ): Promise<TopHighlightsResult[]> {
    const result = await env.DB.prepare(
      `SELECT company_id, highlights, computed_at
       FROM benefits_stats
       ORDER BY computed_at DESC
       LIMIT ?`
    )
      .bind(limit)
      .all();

    return (result.results || []).map((row: any) =>
      CompanyStatsModel.toTopHighlights(row)
    );
  }

  /**
   * Get valuations data across all companies
   *
   * @param env - Cloudflare Workers environment bindings
   * @param limit - Maximum number of results to return
   * @returns Array of valuations results
   *
   * @description Retrieves the most recent total compensation data from all
   * companies for valuation analysis and benchmarking purposes.
   *
   * @example
   * ```typescript
   * const service = new StatsComputationService();
   * const valuations = await service.getValuations(env, 25);
   * console.log(valuations[0].total_comp_heuristics?.total_estimated_value);
   * ```
   */
  async getValuations(env: StatsEnv, limit = 25): Promise<ValuationsResult[]> {
    const result = await env.DB.prepare(
      `SELECT company_id, total_comp_heuristics, computed_at
       FROM benefits_stats
       ORDER BY computed_at DESC
       LIMIT ?`
    )
      .bind(limit)
      .all();

    return (result.results || []).map((row: any) =>
      CompanyStatsModel.toValuations(row)
    );
  }

  /**
   * Validate statistics computation context
   *
   * @param context - Statistics computation context
   * @returns Validation result with errors and warnings
   *
   * @description Validates the statistics computation context to ensure
   * all required data and configuration are present and valid.
   *
   * @example
   * ```typescript
   * const service = new StatsComputationService();
   * const validation = service.validateContext(context);
   * if (!validation.isValid) {
   *   console.error('Validation errors:', validation.errors);
   * }
   * ```
   */
  validateContext(context: StatsContext): StatsValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!context.env.DB) {
      errors.push("Database binding is required");
    }

    if (!context.config) {
      errors.push("Configuration is required");
    }

    if (context.options.months && context.options.months < 1) {
      errors.push("Months must be at least 1");
    }

    if (context.options.months && context.options.months > 24) {
      warnings.push("Months value is very high, computation may be slow");
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get service configuration
   *
   * @returns Current service configuration
   *
   * @description Returns the current service configuration for inspection
   * and debugging purposes.
   *
   * @example
   * ```typescript
   * const service = new StatsComputationService();
   * const config = service.getConfig();
   * console.log('Default months:', config.defaultMonths);
   * ```
   */
  getConfig(): StatsServiceConfig {
    return { ...this.config };
  }

  /**
   * Update service configuration
   *
   * @param newConfig - New configuration values
   * @returns Updated service configuration
   *
   * @description Updates the service configuration with new values,
   * merging with existing configuration.
   *
   * @example
   * ```typescript
   * const service = new StatsComputationService();
   * service.updateConfig({ defaultMonths: 12, maxCompaniesPerBatch: 50 });
   * ```
   */
  updateConfig(newConfig: Partial<StatsServiceConfig>): StatsServiceConfig {
    this.config = { ...this.config, ...newConfig };
    return this.config;
  }
}

/**
 * Statistics reporting service
 *
 * @description Handles the generation of statistical reports and
 * data export functionality for benefits analysis and company metrics.
 */
export class StatsReportingService {
  /**
   * Generate statistics summary report
   *
   * @param env - Cloudflare Workers environment bindings
   * @param options - Report generation options
   * @returns Statistics summary report
   *
   * @description Generates a comprehensive summary report of statistics
   * including key metrics, trends, and insights across all companies.
   *
   * @example
   * ```typescript
   * const service = new StatsReportingService();
   * const report = await service.generateSummaryReport(env, { includeTrends: true });
   * console.log(report.totalCompanies);
   * ```
   */
  async generateSummaryReport(
    env: StatsEnv,
    options: { includeTrends?: boolean } = {}
  ): Promise<any> {
    const companiesResult = await env.DB.prepare(
      "SELECT COUNT(*) as count FROM companies"
    ).first();
    const totalCompanies = companiesResult?.count || 0;

    const statsResult = await env.DB.prepare(
      "SELECT COUNT(*) as count FROM benefits_stats"
    ).first();
    const totalStats = statsResult?.count || 0;

    const latestStats = await env.DB.prepare(
      `SELECT computed_at FROM benefits_stats ORDER BY computed_at DESC LIMIT 1`
    ).first();

    return {
      totalCompanies,
      totalStats,
      lastComputed: latestStats?.computed_at || null,
      generatedAt: Date.now(),
      includeTrends: options.includeTrends || false,
    };
  }

  /**
   * Export statistics data
   *
   * @param env - Cloudflare Workers environment bindings
   * @param options - Export options
   * @returns Exported statistics data
   *
   * @description Exports statistics data in various formats for external
   * analysis and reporting purposes.
   *
   * @example
   * ```typescript
   * const service = new StatsReportingService();
   * const data = await service.exportData(env, { format: 'json', includeRawData: true });
   * console.log(data.recordCount);
   * ```
   */
  async exportData(
    env: StatsEnv,
    options: { format: "json" | "csv"; includeRawData?: boolean } = {}
  ): Promise<any> {
    const query = options.includeRawData
      ? `SELECT * FROM benefits_stats ORDER BY computed_at DESC`
      : `SELECT company_id, computed_at, highlights, total_comp_heuristics, coverage FROM benefits_stats ORDER BY computed_at DESC`;

    const result = await env.DB.prepare(query).all();
    const records = result.results || [];

    return {
      data: records,
      format: options.format,
      exportedAt: new Date(),
      recordCount: records.length,
    };
  }
}
