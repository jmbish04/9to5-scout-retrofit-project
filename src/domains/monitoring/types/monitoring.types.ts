/**
 * Monitoring domain types and interfaces
 *
 * This module defines all TypeScript types and interfaces for the monitoring domain,
 * including job monitoring, tracking history, and monitoring results.
 */

export interface MonitoringEnv {
  DB: any;
  R2: any;
  AI: any;
  MYBROWSER?: any;
  BROWSER?: any;
  VECTORIZE_INDEX: any;
  BROWSER_RENDERING_TOKEN: string;
}

/**
 * Daily monitoring result summary
 */
export interface DailyMonitoringResult {
  date: string;
  jobs_checked: number;
  jobs_modified: number;
  jobs_closed: number;
  errors: number;
  snapshots_created: number;
  pdfs_generated: number;
  markdown_extracts: number;
  processing_time_ms: number;
  success_rate: number;
}

/**
 * Job tracking history entry
 */
export interface JobTrackingHistory {
  id: number;
  job_id: string;
  status: string;
  change_type?: string;
  old_value?: string;
  new_value?: string;
  significance_score?: number;
  ai_summary?: string;
  detected_at: string;
  created_at: string;
}

/**
 * Job monitoring configuration
 */
export interface JobMonitoringConfig {
  id: string;
  job_id: string;
  enabled: boolean;
  check_frequency_hours: number;
  last_checked_at?: string;
  next_check_at?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Monitoring alert configuration
 */
export interface MonitoringAlert {
  id: string;
  name: string;
  type: "job_status_change" | "job_closed" | "error_threshold" | "custom";
  conditions: Record<string, any>;
  enabled: boolean;
  notification_channels: string[];
  created_at: string;
  updated_at: string;
}

/**
 * Monitoring statistics
 */
export interface MonitoringStats {
  total_jobs_monitored: number;
  active_monitors: number;
  jobs_checked_today: number;
  jobs_modified_today: number;
  jobs_closed_today: number;
  average_processing_time_ms: number;
  error_rate_percentage: number;
  last_monitoring_run?: string;
  next_scheduled_run?: string;
}

/**
 * Job change detection result
 */
export interface JobChangeResult {
  job_id: string;
  has_changes: boolean;
  change_type?:
    | "status"
    | "description"
    | "requirements"
    | "location"
    | "salary"
    | "other";
  old_value?: string;
  new_value?: string;
  significance_score: number;
  ai_summary?: string;
  detected_at: string;
}

/**
 * Monitoring batch processing result
 */
export interface MonitoringBatchResult {
  batch_id: string;
  jobs_processed: number;
  jobs_successful: number;
  jobs_failed: number;
  processing_time_ms: number;
  errors: string[];
  started_at: string;
  completed_at: string;
}

/**
 * Monitoring error details
 */
export interface MonitoringError {
  id: string;
  job_id?: string;
  error_type:
    | "crawl_failed"
    | "ai_processing_failed"
    | "storage_failed"
    | "network_error"
    | "unknown";
  error_message: string;
  stack_trace?: string;
  occurred_at: string;
  resolved: boolean;
  resolved_at?: string;
}

/**
 * Monitoring notification
 */
export interface MonitoringNotification {
  id: string;
  type: "alert" | "summary" | "error";
  title: string;
  message: string;
  channels: string[];
  sent_at: string;
  status: "pending" | "sent" | "failed";
  retry_count: number;
}

/**
 * Monitoring configuration
 */
export interface MonitoringConfig {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  check_interval_minutes: number;
  batch_size: number;
  max_retries: number;
  alert_thresholds: {
    error_rate_percentage: number;
    processing_time_ms: number;
    consecutive_failures: number;
  };
  created_at: string;
  updated_at: string;
}

/**
 * Job monitoring status
 */
export interface JobMonitoringStatus {
  job_id: string;
  is_monitoring: boolean;
  last_checked_at?: string;
  next_check_at?: string;
  consecutive_failures: number;
  total_checks: number;
  last_error?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Monitoring report
 */
export interface MonitoringReport {
  id: string;
  report_type: "daily" | "weekly" | "monthly";
  period_start: string;
  period_end: string;
  summary: DailyMonitoringResult;
  detailed_stats: MonitoringStats;
  top_changes: JobChangeResult[];
  errors: MonitoringError[];
  generated_at: string;
}

/**
 * Monitoring dashboard data
 */
export interface MonitoringDashboard {
  stats: MonitoringStats;
  recent_activity: JobChangeResult[];
  active_alerts: MonitoringAlert[];
  system_health: {
    status: "healthy" | "warning" | "critical";
    uptime_percentage: number;
    last_error?: string;
  };
  performance_metrics: {
    average_processing_time_ms: number;
    success_rate_percentage: number;
    error_rate_percentage: number;
  };
}
