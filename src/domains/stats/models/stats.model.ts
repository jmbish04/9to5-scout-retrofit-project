/**
 * Stats Domain Models
 *
 * Data models and validation schemas for statistics computation and analysis.
 * Provides structured data handling for benefits analysis, company metrics,
 * and performance reporting within the 9to5 Scout application.
 *
 * @fileoverview This module defines data models, validation schemas, and
 * data transformation utilities for statistical analysis operations.
 */

import type {
  CompanyStats,
  ComputedStats,
  CoverageData,
  HighlightsData,
  ParsedSnapshot,
  TopHighlightsResult,
  TotalCompData,
  ValuationsResult,
} from "../types/stats.types";

/**
 * Statistics computation model
 *
 * @description Handles the core logic for computing statistics from parsed snapshots
 * and provides methods for data transformation and analysis.
 */
export class StatsComputationModel {
  /**
   * Parse snapshot data from database row
   *
   * @param row - Raw snapshot row from database
   * @returns Parsed snapshot data or null if parsing fails
   *
   * @description Safely parses JSON data from database snapshots with error handling.
   * Adds metadata like extraction timestamp for proper sorting and analysis.
   *
   * @example
   * ```typescript
   * const snapshot = StatsComputationModel.parseSnapshot(dbRow);
   * if (snapshot) {
   *   // Process the parsed snapshot
   * }
   * ```
   */
  static parseSnapshot(row: {
    parsed: string | null;
    extracted_at: number;
    source: string;
  }): ParsedSnapshot | null {
    if (!row.parsed) {
      return null;
    }

    try {
      const parsed = JSON.parse(row.parsed) as ParsedSnapshot;
      parsed._extractedAt = row.extracted_at;
      return parsed;
    } catch (error) {
      console.warn("Failed to parse snapshot JSON", error);
      return null;
    }
  }

  /**
   * Compute average value from array of numbers
   *
   * @param values - Array of numeric values
   * @returns Average value or null if no valid values
   *
   * @description Calculates the arithmetic mean of valid numeric values,
   * filtering out non-finite numbers for accurate computation.
   *
   * @example
   * ```typescript
   * const avg = StatsComputationModel.avg([100, 200, 300]); // 200
   * const invalid = StatsComputationModel.avg([100, NaN, 200]); // 150
   * ```
   */
  static avg(values: number[]): number | null {
    const filtered = values.filter((value) => Number.isFinite(value));
    if (!filtered.length) {
      return null;
    }
    const total = filtered.reduce((acc, value) => acc + value, 0);
    return total / filtered.length;
  }

  /**
   * Compute highlights from parsed snapshots
   *
   * @param parsedSnapshots - Array of parsed snapshot data
   * @returns Highlights analysis data
   *
   * @description Analyzes parsed snapshots to identify standout benefits,
   * anomalies, and notable features that distinguish companies.
   *
   * @example
   * ```typescript
   * const highlights = StatsComputationModel.computeHighlights(snapshots);
   * console.log(highlights.standout); // Array of standout benefits
   * ```
   */
  static computeHighlights(parsedSnapshots: ParsedSnapshot[]): HighlightsData {
    const highlights: HighlightsData = {
      standout: [],
      anomalies: [],
      notes: [],
    };

    const latest = parsedSnapshots[0];
    if (!latest) {
      return highlights;
    }

    // Check for standout retirement benefits
    const match = latest.retirement?.match_percent;
    if (Number.isFinite(match) && match >= 6) {
      highlights.standout.push({
        type: "retirement",
        message: "401k match >= 6%",
        value: match,
      });
    }

    // Check for standout parental leave
    const parental = latest.time_off?.parental_leave_weeks;
    if (Number.isFinite(parental) && parental >= 16) {
      highlights.standout.push({
        type: "family",
        message: "Parental leave 16+ weeks",
        value: parental,
      });
    }

    // Check for work-from-anywhere flexibility
    const wfa = latest.work_model?.work_from_anywhere_weeks;
    if (Number.isFinite(wfa) && wfa >= 4) {
      highlights.standout.push({
        type: "flexibility",
        message: "Work-from-anywhere 4+ weeks",
        value: wfa,
      });
    }

    // Check for generous PTO
    const pto = latest.time_off?.pto_days;
    if (Number.isFinite(pto) && pto >= 25) {
      highlights.standout.push({
        type: "time_off",
        message: "25+ PTO days",
        value: pto,
      });
    }

    // Check for unusual bonus targets
    if (
      latest.compensation?.bonus?.target_percent &&
      latest.compensation.bonus.target_percent >= 40
    ) {
      highlights.anomalies.push({
        type: "bonus",
        message: "Bonus target unusually high",
        value: latest.compensation.bonus.target_percent,
      });
    }

    return highlights;
  }

  /**
   * Compute coverage analysis from parsed snapshots
   *
   * @param parsedSnapshots - Array of parsed snapshot data
   * @returns Coverage analysis data
   *
   * @description Analyzes the presence and confidence of different benefit
   * categories across multiple snapshots to assess data completeness.
   *
   * @example
   * ```typescript
   * const coverage = StatsComputationModel.computeCoverage(snapshots);
   * console.log(coverage.compensation.confidence); // 0.85
   * ```
   */
  static computeCoverage(parsedSnapshots: ParsedSnapshot[]): CoverageData {
    const categories = {
      compensation: 0,
      retirement: 0,
      healthcare: 0,
      time_off: 0,
      work_model: 0,
      perks: 0,
    };

    parsedSnapshots.forEach((snapshot) => {
      if (!snapshot) return;
      if (snapshot.compensation) categories.compensation += 1;
      if (snapshot.retirement) categories.retirement += 1;
      if (snapshot.healthcare) categories.healthcare += 1;
      if (snapshot.time_off) categories.time_off += 1;
      if (snapshot.work_model) categories.work_model += 1;
      if (snapshot.perks && snapshot.perks.length) categories.perks += 1;
    });

    const total = parsedSnapshots.length || 1;
    return {
      compensation: {
        present: categories.compensation > 0,
        confidence: categories.compensation / total,
      },
      retirement: {
        present: categories.retirement > 0,
        confidence: categories.retirement / total,
      },
      healthcare: {
        present: categories.healthcare > 0,
        confidence: categories.healthcare / total,
      },
      time_off: {
        present: categories.time_off > 0,
        confidence: categories.time_off / total,
      },
      work_model: {
        present: categories.work_model > 0,
        confidence: categories.work_model / total,
      },
      perks: {
        present: categories.perks > 0,
        confidence: categories.perks / total,
      },
    };
  }

  /**
   * Compute total compensation heuristics
   *
   * @param parsedSnapshots - Array of parsed snapshot data
   * @returns Total compensation calculation data
   *
   * @description Calculates estimated total compensation value including
   * base salary, benefits, and other compensation components.
   *
   * @example
   * ```typescript
   * const totals = StatsComputationModel.computeTotals(snapshots);
   * console.log(totals.total_estimated_value); // 150000
   * ```
   */
  static computeTotals(parsedSnapshots: ParsedSnapshot[]): TotalCompData {
    const latest = parsedSnapshots[0];
    if (!latest) {
      return {
        estimated_base: null,
        assumptions: {
          default_base: 120000,
          work_days_per_year: 260,
        },
        components: {},
        total_estimated_value: 0,
      };
    }

    // Calculate base salary from range
    const baseRange = latest.compensation?.base_range;
    const baseCandidates: number[] = [];
    if (Number.isFinite(baseRange?.min)) baseCandidates.push(baseRange.min!);
    if (Number.isFinite(baseRange?.max)) baseCandidates.push(baseRange.max!);
    const averageBase = this.avg(baseCandidates) || 120000;
    const dailyRate = averageBase / 260;

    // Extract benefit values
    const ptoDays = Number.isFinite(latest.time_off?.pto_days)
      ? latest.time_off!.pto_days!
      : 0;
    const parentalWeeks = Number.isFinite(latest.time_off?.parental_leave_weeks)
      ? latest.time_off!.parental_leave_weeks!
      : 0;
    const matchPercent = Number.isFinite(latest.retirement?.match_percent)
      ? latest.retirement!.match_percent!
      : 0;
    const bonusPercent = Number.isFinite(
      latest.compensation?.bonus?.target_percent
    )
      ? latest.compensation!.bonus!.target_percent!
      : 0;
    const wfaWeeks = Number.isFinite(
      latest.work_model?.work_from_anywhere_weeks
    )
      ? latest.work_model!.work_from_anywhere_weeks!
      : 0;

    // Calculate component values
    const components: Record<string, number> = {};
    components.pto = ptoDays * dailyRate;
    components.parental_leave = parentalWeeks * 5 * dailyRate;
    components.retirement_match =
      averageBase * Math.min(matchPercent / 100, 0.06);
    components.bonus = averageBase * (bonusPercent / 100);
    components.healthcare = latest.healthcare?.medical?.present ? 9000 : 6000;
    components.equity = latest.compensation?.equity?.present
      ? averageBase * 0.1
      : 0;
    components.flexibility = wfaWeeks * 5 * dailyRate;

    const total_estimated_value = Object.values(components).reduce(
      (acc, value) => acc + value,
      0
    );

    return {
      estimated_base: averageBase,
      assumptions: {
        default_base: 120000,
        work_days_per_year: 260,
        healthcare_range: { low: 6000, high: 15000 },
      },
      components,
      total_estimated_value,
    };
  }

  /**
   * Compute complete statistics from parsed snapshots
   *
   * @param parsedSnapshots - Array of parsed snapshot data
   * @returns Complete computed statistics
   *
   * @description Orchestrates the computation of all statistical analyses
   * including highlights, coverage, and total compensation calculations.
   *
   * @example
   * ```typescript
   * const stats = StatsComputationModel.computeStats(snapshots);
   * console.log(stats.highlights.standout.length); // Number of standout benefits
   * ```
   */
  static computeStats(parsedSnapshots: ParsedSnapshot[]): ComputedStats {
    const sorted = [...parsedSnapshots].sort(
      (a, b) => (b?._extractedAt || 0) - (a?._extractedAt || 0)
    );
    const highlights = this.computeHighlights(sorted);
    const coverage = this.computeCoverage(sorted);
    const total_comp_heuristics = this.computeTotals(sorted);
    return { highlights, coverage, total_comp_heuristics };
  }
}

/**
 * Company statistics model
 *
 * @description Handles company-specific statistics data and provides
 * methods for data transformation and validation.
 */
export class CompanyStatsModel {
  /**
   * Transform database result to company stats
   *
   * @param row - Database row result
   * @returns Company statistics object
   *
   * @description Converts raw database results into structured company
   * statistics with proper JSON parsing and type safety.
   *
   * @example
   * ```typescript
   * const stats = CompanyStatsModel.fromDbRow(dbResult);
   * console.log(stats.highlights?.standout); // Array of standout benefits
   * ```
   */
  static fromDbRow(row: any): CompanyStats {
    return {
      company_id: row.company_id,
      computed_at: row.computed_at,
      highlights: row.highlights ? JSON.parse(row.highlights) : null,
      total_comp_heuristics: row.total_comp_heuristics
        ? JSON.parse(row.total_comp_heuristics)
        : null,
      coverage: row.coverage ? JSON.parse(row.coverage) : null,
    };
  }

  /**
   * Transform database result to top highlights
   *
   * @param row - Database row result
   * @returns Top highlights result object
   *
   * @description Converts database results for top highlights queries
   * into structured data with proper JSON parsing.
   *
   * @example
   * ```typescript
   * const highlights = CompanyStatsModel.toTopHighlights(dbResult);
   * console.log(highlights.highlights?.standout); // Array of standout benefits
   * ```
   */
  static toTopHighlights(row: any): TopHighlightsResult {
    return {
      company_id: row.company_id,
      computed_at: row.computed_at,
      highlights: row.highlights ? JSON.parse(row.highlights) : null,
    };
  }

  /**
   * Transform database result to valuations
   *
   * @param row - Database row result
   * @returns Valuations result object
   *
   * @description Converts database results for valuations queries
   * into structured data with proper JSON parsing.
   *
   * @example
   * ```typescript
   * const valuations = CompanyStatsModel.toValuations(dbResult);
   * console.log(valuations.total_comp_heuristics?.total_estimated_value); // Total value
   * ```
   */
  static toValuations(row: any): ValuationsResult {
    return {
      company_id: row.company_id,
      computed_at: row.computed_at,
      total_comp_heuristics: row.total_comp_heuristics
        ? JSON.parse(row.total_comp_heuristics)
        : null,
    };
  }
}
