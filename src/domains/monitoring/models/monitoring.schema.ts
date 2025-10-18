/**
 * Monitoring domain Zod schemas for validation
 *
 * This module defines Zod schemas for validating monitoring-related data structures,
 * ensuring type safety and data integrity across the monitoring domain.
 */

import { z } from "zod";

// Base enums
export const MonitoringErrorTypeSchema = z.enum([
  "crawl_failed",
  "ai_processing_failed",
  "storage_failed",
  "network_error",
  "unknown",
]);

export const JobChangeTypeSchema = z.enum([
  "status",
  "description",
  "requirements",
  "location",
  "salary",
  "other",
]);

export const AlertTypeSchema = z.enum([
  "job_status_change",
  "job_closed",
  "error_threshold",
  "custom",
]);

export const NotificationTypeSchema = z.enum(["alert", "summary", "error"]);

export const NotificationStatusSchema = z.enum(["pending", "sent", "failed"]);

export const ReportTypeSchema = z.enum(["daily", "weekly", "monthly"]);

export const SystemHealthStatusSchema = z.enum([
  "healthy",
  "warning",
  "critical",
]);

// Daily monitoring result schema
export const DailyMonitoringResultSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  jobs_checked: z.number().int().min(0),
  jobs_modified: z.number().int().min(0),
  jobs_closed: z.number().int().min(0),
  errors: z.number().int().min(0),
  snapshots_created: z.number().int().min(0),
  pdfs_generated: z.number().int().min(0),
  markdown_extracts: z.number().int().min(0),
  processing_time_ms: z.number().min(0),
  success_rate: z.number().min(0).max(100),
});

// Job tracking history schema
export const JobTrackingHistorySchema = z.object({
  id: z.number().int().positive(),
  job_id: z.string().min(1),
  status: z.string().min(1),
  change_type: z.string().optional(),
  old_value: z.string().optional(),
  new_value: z.string().optional(),
  significance_score: z.number().min(0).max(100).optional(),
  ai_summary: z.string().optional(),
  detected_at: z.string().datetime(),
  created_at: z.string().datetime(),
});

// Job monitoring configuration schema
export const JobMonitoringConfigSchema = z.object({
  id: z.string().min(1),
  job_id: z.string().min(1),
  enabled: z.boolean(),
  check_frequency_hours: z.number().int().min(1).max(168), // 1 hour to 1 week
  last_checked_at: z.string().datetime().optional(),
  next_check_at: z.string().datetime().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Monitoring alert schema
export const MonitoringAlertSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: AlertTypeSchema,
  conditions: z.record(z.string(), z.any()),
  enabled: z.boolean(),
  notification_channels: z.array(z.string()),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Monitoring statistics schema
export const MonitoringStatsSchema = z.object({
  total_jobs_monitored: z.number().int().min(0),
  active_monitors: z.number().int().min(0),
  jobs_checked_today: z.number().int().min(0),
  jobs_modified_today: z.number().int().min(0),
  jobs_closed_today: z.number().int().min(0),
  average_processing_time_ms: z.number().min(0),
  error_rate_percentage: z.number().min(0).max(100),
  last_monitoring_run: z.string().datetime().optional(),
  next_scheduled_run: z.string().datetime().optional(),
});

// Job change detection result schema
export const JobChangeResultSchema = z.object({
  job_id: z.string().min(1),
  has_changes: z.boolean(),
  change_type: JobChangeTypeSchema.optional(),
  old_value: z.string().optional(),
  new_value: z.string().optional(),
  significance_score: z.number().min(0).max(100),
  ai_summary: z.string().optional(),
  detected_at: z.string().datetime(),
});

// Monitoring batch processing result schema
export const MonitoringBatchResultSchema = z.object({
  batch_id: z.string().min(1),
  jobs_processed: z.number().int().min(0),
  jobs_successful: z.number().int().min(0),
  jobs_failed: z.number().int().min(0),
  processing_time_ms: z.number().min(0),
  errors: z.array(z.string()),
  started_at: z.string().datetime(),
  completed_at: z.string().datetime(),
});

// Monitoring error schema
export const MonitoringErrorSchema = z.object({
  id: z.string().min(1),
  job_id: z.string().optional(),
  error_type: MonitoringErrorTypeSchema,
  error_message: z.string().min(1),
  stack_trace: z.string().optional(),
  occurred_at: z.string().datetime(),
  resolved: z.boolean(),
  resolved_at: z.string().datetime().optional(),
});

// Monitoring notification schema
export const MonitoringNotificationSchema = z.object({
  id: z.string().min(1),
  type: NotificationTypeSchema,
  title: z.string().min(1),
  message: z.string().min(1),
  channels: z.array(z.string()),
  sent_at: z.string().datetime(),
  status: NotificationStatusSchema,
  retry_count: z.number().int().min(0),
});

// Monitoring configuration schema
export const MonitoringConfigSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  enabled: z.boolean(),
  check_interval_minutes: z.number().int().min(1).max(1440), // 1 minute to 24 hours
  batch_size: z.number().int().min(1).max(100),
  max_retries: z.number().int().min(0).max(10),
  alert_thresholds: z.object({
    error_rate_percentage: z.number().min(0).max(100),
    processing_time_ms: z.number().min(0),
    consecutive_failures: z.number().int().min(0),
  }),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Job monitoring status schema
export const JobMonitoringStatusSchema = z.object({
  job_id: z.string().min(1),
  is_monitoring: z.boolean(),
  last_checked_at: z.string().datetime().optional(),
  next_check_at: z.string().datetime().optional(),
  consecutive_failures: z.number().int().min(0),
  total_checks: z.number().int().min(0),
  last_error: z.string().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Monitoring report schema
export const MonitoringReportSchema = z.object({
  id: z.string().min(1),
  report_type: ReportTypeSchema,
  period_start: z.string().datetime(),
  period_end: z.string().datetime(),
  summary: DailyMonitoringResultSchema,
  detailed_stats: MonitoringStatsSchema,
  top_changes: z.array(JobChangeResultSchema),
  errors: z.array(MonitoringErrorSchema),
  generated_at: z.string().datetime(),
});

// System health schema
export const SystemHealthSchema = z.object({
  status: SystemHealthStatusSchema,
  uptime_percentage: z.number().min(0).max(100),
  last_error: z.string().optional(),
});

// Performance metrics schema
export const PerformanceMetricsSchema = z.object({
  average_processing_time_ms: z.number().min(0),
  success_rate_percentage: z.number().min(0).max(100),
  error_rate_percentage: z.number().min(0).max(100),
});

// Monitoring dashboard schema
export const MonitoringDashboardSchema = z.object({
  stats: MonitoringStatsSchema,
  recent_activity: z.array(JobChangeResultSchema),
  active_alerts: z.array(MonitoringAlertSchema),
  system_health: SystemHealthSchema,
  performance_metrics: PerformanceMetricsSchema,
});

// Request/Response schemas for API endpoints
export const CreateMonitoringConfigRequestSchema = MonitoringConfigSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const UpdateMonitoringConfigRequestSchema =
  MonitoringConfigSchema.partial().omit({
    id: true,
    created_at: true,
  });

export const CreateJobMonitoringRequestSchema = JobMonitoringConfigSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const UpdateJobMonitoringRequestSchema =
  JobMonitoringConfigSchema.partial().omit({
    id: true,
    created_at: true,
  });

export const CreateAlertRequestSchema = MonitoringAlertSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const UpdateAlertRequestSchema = MonitoringAlertSchema.partial().omit({
  id: true,
  created_at: true,
});

// Response schemas
export const MonitoringConfigResponseSchema = MonitoringConfigSchema;
export const JobMonitoringResponseSchema = JobMonitoringConfigSchema;
export const AlertResponseSchema = MonitoringAlertSchema;
export const MonitoringStatsResponseSchema = MonitoringStatsSchema;
export const MonitoringDashboardResponseSchema = MonitoringDashboardSchema;
export const MonitoringReportResponseSchema = MonitoringReportSchema;

// Type exports for use in other modules
export type MonitoringErrorType = z.infer<typeof MonitoringErrorTypeSchema>;
export type JobChangeType = z.infer<typeof JobChangeTypeSchema>;
export type AlertType = z.infer<typeof AlertTypeSchema>;
export type NotificationType = z.infer<typeof NotificationTypeSchema>;
export type NotificationStatus = z.infer<typeof NotificationStatusSchema>;
export type ReportType = z.infer<typeof ReportTypeSchema>;
export type SystemHealthStatus = z.infer<typeof SystemHealthStatusSchema>;
export type DailyMonitoringResult = z.infer<typeof DailyMonitoringResultSchema>;
export type JobTrackingHistory = z.infer<typeof JobTrackingHistorySchema>;
export type JobMonitoringConfig = z.infer<typeof JobMonitoringConfigSchema>;
export type MonitoringAlert = z.infer<typeof MonitoringAlertSchema>;
export type MonitoringStats = z.infer<typeof MonitoringStatsSchema>;
export type JobChangeResult = z.infer<typeof JobChangeResultSchema>;
export type MonitoringBatchResult = z.infer<typeof MonitoringBatchResultSchema>;
export type MonitoringError = z.infer<typeof MonitoringErrorSchema>;
export type MonitoringNotification = z.infer<
  typeof MonitoringNotificationSchema
>;
export type MonitoringConfig = z.infer<typeof MonitoringConfigSchema>;
export type JobMonitoringStatus = z.infer<typeof JobMonitoringStatusSchema>;
export type MonitoringReport = z.infer<typeof MonitoringReportSchema>;
export type SystemHealth = z.infer<typeof SystemHealthSchema>;
export type PerformanceMetrics = z.infer<typeof PerformanceMetricsSchema>;
export type MonitoringDashboard = z.infer<typeof MonitoringDashboardSchema>;
export type CreateMonitoringConfigRequest = z.infer<
  typeof CreateMonitoringConfigRequestSchema
>;
export type UpdateMonitoringConfigRequest = z.infer<
  typeof UpdateMonitoringConfigRequestSchema
>;
export type CreateJobMonitoringRequest = z.infer<
  typeof CreateJobMonitoringRequestSchema
>;
export type UpdateJobMonitoringRequest = z.infer<
  typeof UpdateJobMonitoringRequestSchema
>;
export type CreateAlertRequest = z.infer<typeof CreateAlertRequestSchema>;
export type UpdateAlertRequest = z.infer<typeof UpdateAlertRequestSchema>;
export type MonitoringConfigResponse = z.infer<
  typeof MonitoringConfigResponseSchema
>;
export type JobMonitoringResponse = z.infer<typeof JobMonitoringResponseSchema>;
export type AlertResponse = z.infer<typeof AlertResponseSchema>;
export type MonitoringStatsResponse = z.infer<
  typeof MonitoringStatsResponseSchema
>;
export type MonitoringDashboardResponse = z.infer<
  typeof MonitoringDashboardResponseSchema
>;
export type MonitoringReportResponse = z.infer<
  typeof MonitoringReportResponseSchema
>;
