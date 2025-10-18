/**
 * Stats Domain Types
 *
 * Type definitions for statistics computation, analysis, and reporting.
 * Provides comprehensive typing for benefits analysis, company statistics,
 * and performance metrics within the 9to5 Scout application.
 *
 * @fileoverview This module defines all types related to statistical analysis
 * including benefits computation, company metrics, and reporting interfaces.
 */

/**
 * Environment interface for stats operations
 */
export interface StatsEnv {
  DB: any;
}

/**
 * Raw snapshot data from database
 */
export interface SnapshotRow {
  parsed: string | null;
  extracted_at: number;
  source: string;
}

/**
 * Parsed snapshot data with metadata
 */
export interface ParsedSnapshot {
  _extractedAt?: number;
  compensation?: CompensationData;
  retirement?: RetirementData;
  healthcare?: HealthcareData;
  time_off?: TimeOffData;
  work_model?: WorkModelData;
  perks?: string[];
}

/**
 * Compensation data structure
 */
export interface CompensationData {
  base_range?: {
    min?: number;
    max?: number;
  };
  bonus?: {
    target_percent?: number;
  };
  equity?: {
    present?: boolean;
  };
}

/**
 * Retirement benefits data
 */
export interface RetirementData {
  match_percent?: number;
}

/**
 * Healthcare benefits data
 */
export interface HealthcareData {
  medical?: {
    present?: boolean;
  };
}

/**
 * Time off benefits data
 */
export interface TimeOffData {
  pto_days?: number;
  parental_leave_weeks?: number;
}

/**
 * Work model data
 */
export interface WorkModelData {
  work_from_anywhere_weeks?: number;
}

/**
 * Computed statistics result
 */
export interface ComputedStats {
  highlights: HighlightsData;
  total_comp_heuristics: TotalCompData;
  coverage: CoverageData;
}

/**
 * Highlights analysis data
 */
export interface HighlightsData {
  standout: HighlightItem[];
  anomalies: HighlightItem[];
  notes: string[];
}

/**
 * Individual highlight item
 */
export interface HighlightItem {
  type: string;
  message: string;
  value: number;
}

/**
 * Coverage analysis data
 */
export interface CoverageData {
  compensation: CoverageItem;
  retirement: CoverageItem;
  healthcare: CoverageItem;
  time_off: CoverageItem;
  work_model: CoverageItem;
  perks: CoverageItem;
}

/**
 * Coverage item with presence and confidence
 */
export interface CoverageItem {
  present: boolean;
  confidence: number;
}

/**
 * Total compensation calculation data
 */
export interface TotalCompData {
  estimated_base: number | null;
  assumptions: CompensationAssumptions;
  components: Record<string, number>;
  total_estimated_value: number;
}

/**
 * Compensation calculation assumptions
 */
export interface CompensationAssumptions {
  default_base: number;
  work_days_per_year: number;
  healthcare_range?: {
    low: number;
    high: number;
  };
}

/**
 * Rollup options for statistics computation
 */
export interface RollupOptions {
  months?: number;
  dryRun?: boolean;
  companyId?: string;
}

/**
 * Statistics computation result
 */
export interface StatsComputationResult {
  processed: number;
}

/**
 * Company statistics data
 */
export interface CompanyStats {
  company_id: string;
  computed_at: number;
  highlights: HighlightsData | null;
  total_comp_heuristics: TotalCompData | null;
  coverage: CoverageData | null;
}

/**
 * Top highlights result
 */
export interface TopHighlightsResult {
  company_id: string;
  computed_at: number;
  highlights: HighlightsData | null;
}

/**
 * Valuations result
 */
export interface ValuationsResult {
  company_id: string;
  computed_at: number;
  total_comp_heuristics: TotalCompData | null;
}

/**
 * Statistics service configuration
 */
export interface StatsServiceConfig {
  defaultMonths: number;
  maxCompaniesPerBatch: number;
  enableDryRun: boolean;
}

/**
 * Statistics computation context
 */
export interface StatsContext {
  env: StatsEnv;
  config: StatsServiceConfig;
  options: RollupOptions;
}

/**
 * Statistics validation result
 */
export interface StatsValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Statistics export options
 */
export interface StatsExportOptions {
  format: "json" | "csv" | "xlsx";
  includeRawData: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
  companyIds?: string[];
}

/**
 * Statistics export result
 */
export interface StatsExportResult {
  data: any;
  format: string;
  exportedAt: Date;
  recordCount: number;
}
