/**
 * Workflow Schemas
 *
 * Zod schemas for validating workflow-related data structures.
 */

import { z } from "zod";

// Base schemas
export const WorkflowTypeSchema = z.enum([
  "discovery",
  "job_monitor",
  "change_analysis",
]);
export const WorkflowStatusSchema = z.enum([
  "pending",
  "running",
  "completed",
  "failed",
  "cancelled",
]);
export const WorkflowStepStatusSchema = z.enum([
  "pending",
  "running",
  "completed",
  "failed",
  "skipped",
]);

// Notification settings schema
export const NotificationSettingsSchema = z.object({
  on_success: z.boolean().optional(),
  on_failure: z.boolean().optional(),
  on_completion: z.boolean().optional(),
  webhook_url: z.string().url().optional(),
  email_recipients: z.array(z.string().email()).optional(),
});

// Workflow config schema
export const WorkflowConfigSchema = z.object({
  max_retries: z.number().int().min(0).max(10).optional(),
  timeout_minutes: z.number().int().min(1).max(1440).optional(),
  parallel_execution: z.boolean().optional(),
  notification_settings: NotificationSettingsSchema.optional(),
  custom_settings: z.record(z.string(), z.unknown()).optional(),
});

// Workflow metrics schema
export const WorkflowMetricsSchema = z.object({
  duration_ms: z.number().int().min(0),
  steps_completed: z.number().int().min(0),
  steps_failed: z.number().int().min(0),
  resources_used: z.record(z.string(), z.number()),
});

// Workflow result schema
export const WorkflowResultSchema = z.object({
  success: z.boolean(),
  data: z.record(z.unknown()).optional(),
  errors: z.array(z.string()).optional(),
  warnings: z.array(z.string()).optional(),
  metrics: WorkflowMetricsSchema.optional(),
});

// Workflow step schema
export const WorkflowStepSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  status: WorkflowStepStatusSchema,
  started_at: z.string().datetime().optional(),
  completed_at: z.string().datetime().optional(),
  error: z.string().optional(),
  result: z.record(z.unknown()).optional(),
  retry_count: z.number().int().min(0),
  max_retries: z.number().int().min(0),
});

// Workflow instance schema
export const WorkflowInstanceSchema = z.object({
  id: z.string().uuid(),
  type: WorkflowTypeSchema,
  status: WorkflowStatusSchema,
  site_id: z.string().uuid().optional(),
  job_id: z.string().uuid().optional(),
  config: WorkflowConfigSchema,
  current_step: z.string().optional(),
  progress: z.number().min(0).max(100),
  started_at: z.string().datetime(),
  completed_at: z.string().datetime().optional(),
  error: z.string().optional(),
  result: WorkflowResultSchema.optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Discovery workflow config schema
export const DiscoveryWorkflowConfigSchema = WorkflowConfigSchema.extend({
  site_id: z.string().uuid(),
  discovery_strategy: z.enum(["sitemap", "list", "search", "custom"]),
  max_pages: z.number().int().min(1).max(10000).optional(),
  delay_between_requests_ms: z.number().int().min(0).max(10000).optional(),
  respect_robots_txt: z.boolean().optional(),
  custom_selectors: z.record(z.string()).optional(),
});

// Job monitor workflow config schema
export const JobMonitorWorkflowConfigSchema = WorkflowConfigSchema.extend({
  job_ids: z.array(z.string().uuid()).min(1),
  check_frequency_hours: z.number().int().min(1).max(168).optional(),
  change_threshold: z.number().min(0).max(1).optional(),
  alert_on_status_change: z.boolean().optional(),
  alert_on_content_change: z.boolean().optional(),
});

// Change analysis workflow config schema
export const ChangeAnalysisWorkflowConfigSchema = WorkflowConfigSchema.extend({
  job_id: z.string().uuid(),
  old_content: z.string().min(1),
  new_content: z.string().min(1),
  analysis_depth: z.enum(["basic", "detailed", "comprehensive"]).optional(),
  include_ai_analysis: z.boolean().optional(),
  generate_summary: z.boolean().optional(),
});

// Workflow execution schema
export const WorkflowExecutionSchema = z.object({
  id: z.string().uuid(),
  workflow_instance_id: z.string().uuid(),
  step_id: z.string().uuid(),
  status: WorkflowStepStatusSchema,
  started_at: z.string().datetime(),
  completed_at: z.string().datetime().optional(),
  error: z.string().optional(),
  result: z.record(z.unknown()).optional(),
  retry_count: z.number().int().min(0),
  execution_time_ms: z.number().int().min(0).optional(),
});

// Workflow log schema
export const WorkflowLogSchema = z.object({
  id: z.string().uuid(),
  workflow_instance_id: z.string().uuid(),
  step_id: z.string().uuid().optional(),
  level: z.enum(["debug", "info", "warn", "error"]),
  message: z.string().min(1),
  data: z.record(z.unknown()).optional(),
  timestamp: z.string().datetime(),
});

// Workflow type stats schema
export const WorkflowTypeStatsSchema = z.object({
  total: z.number().int().min(0),
  running: z.number().int().min(0),
  completed: z.number().int().min(0),
  failed: z.number().int().min(0),
  average_duration_ms: z.number().min(0),
  success_rate_percentage: z.number().min(0).max(100),
});

// Workflow stats schema
export const WorkflowStatsSchema = z.object({
  total_workflows: z.number().int().min(0),
  running_workflows: z.number().int().min(0),
  completed_workflows: z.number().int().min(0),
  failed_workflows: z.number().int().min(0),
  average_duration_ms: z.number().min(0),
  success_rate_percentage: z.number().min(0).max(100),
  error_rate_percentage: z.number().min(0).max(100),
  by_type: z.record(WorkflowTypeSchema, WorkflowTypeStatsSchema),
});

// Request/Response schemas
export const CreateWorkflowRequestSchema = z.object({
  type: WorkflowTypeSchema,
  site_id: z.string().uuid().optional(),
  job_id: z.string().uuid().optional(),
  config: WorkflowConfigSchema,
});

export const UpdateWorkflowRequestSchema = z.object({
  status: WorkflowStatusSchema.optional(),
  config: WorkflowConfigSchema.partial().optional(),
  current_step: z.string().optional(),
  progress: z.number().min(0).max(100).optional(),
  error: z.string().optional(),
  result: WorkflowResultSchema.optional(),
  started_at: z.string().datetime().optional(),
  completed_at: z.string().datetime().optional(),
});

export const WorkflowStepRequestSchema = z.object({
  workflow_instance_id: z.string().uuid(),
  step_name: z.string().min(1),
  config: z.record(z.unknown()).optional(),
});

export const WorkflowLogRequestSchema = z.object({
  workflow_instance_id: z.string().uuid(),
  step_id: z.string().uuid().optional(),
  level: z.enum(["debug", "info", "warn", "error"]).optional(),
  limit: z.number().int().min(1).max(1000).optional(),
  offset: z.number().int().min(0).optional(),
});

export const WorkflowListResponseSchema = z.object({
  workflows: z.array(WorkflowInstanceSchema),
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
  has_more: z.boolean(),
});

export const WorkflowExecutionResponseSchema = z.object({
  execution: WorkflowExecutionSchema,
  logs: z.array(WorkflowLogSchema),
});

export const WorkflowStatsResponseSchema = z.object({
  stats: WorkflowStatsSchema,
  period: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  }),
});

export const WorkflowStepResponseSchema = z.object({
  step: WorkflowStepSchema,
  execution: WorkflowExecutionSchema,
});

export const WorkflowLogResponseSchema = z.object({
  logs: z.array(WorkflowLogSchema),
  total: z.number().int().min(0),
  has_more: z.boolean(),
});

// Type exports
export type WorkflowType = z.infer<typeof WorkflowTypeSchema>;
export type WorkflowStatus = z.infer<typeof WorkflowStatusSchema>;
export type WorkflowStepStatus = z.infer<typeof WorkflowStepStatusSchema>;
export type NotificationSettings = z.infer<typeof NotificationSettingsSchema>;
export type WorkflowConfig = z.infer<typeof WorkflowConfigSchema>;
export type WorkflowMetrics = z.infer<typeof WorkflowMetricsSchema>;
export type WorkflowResult = z.infer<typeof WorkflowResultSchema>;
export type WorkflowStep = z.infer<typeof WorkflowStepSchema>;
export type WorkflowInstance = z.infer<typeof WorkflowInstanceSchema>;
export type DiscoveryWorkflowConfig = z.infer<
  typeof DiscoveryWorkflowConfigSchema
>;
export type JobMonitorWorkflowConfig = z.infer<
  typeof JobMonitorWorkflowConfigSchema
>;
export type ChangeAnalysisWorkflowConfig = z.infer<
  typeof ChangeAnalysisWorkflowConfigSchema
>;
export type WorkflowExecution = z.infer<typeof WorkflowExecutionSchema>;
export type WorkflowLog = z.infer<typeof WorkflowLogSchema>;
export type WorkflowTypeStats = z.infer<typeof WorkflowTypeStatsSchema>;
export type WorkflowStats = z.infer<typeof WorkflowStatsSchema>;
export type CreateWorkflowRequest = z.infer<typeof CreateWorkflowRequestSchema>;
export type UpdateWorkflowRequest = z.infer<typeof UpdateWorkflowRequestSchema>;
export type WorkflowStepRequest = z.infer<typeof WorkflowStepRequestSchema>;
export type WorkflowLogRequest = z.infer<typeof WorkflowLogRequestSchema>;
export type WorkflowListResponse = z.infer<typeof WorkflowListResponseSchema>;
export type WorkflowExecutionResponse = z.infer<
  typeof WorkflowExecutionResponseSchema
>;
export type WorkflowStatsResponse = z.infer<typeof WorkflowStatsResponseSchema>;
export type WorkflowStepResponse = z.infer<typeof WorkflowStepResponseSchema>;
export type WorkflowLogResponse = z.infer<typeof WorkflowLogResponseSchema>;
