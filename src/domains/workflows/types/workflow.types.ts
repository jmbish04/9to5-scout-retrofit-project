/**
 * Workflow Types
 *
 * TypeScript interfaces and types for workflow management,
 * including discovery, job monitoring, and change analysis workflows.
 */

export type WorkflowType = "discovery" | "job_monitor" | "change_analysis";

export type WorkflowStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export type WorkflowStepStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "skipped";

export interface WorkflowInstance {
  id: string;
  type: WorkflowType;
  status: WorkflowStatus;
  site_id?: string;
  job_id?: string;
  config: WorkflowConfig;
  current_step?: string;
  progress: number; // 0-100
  started_at: string;
  completed_at?: string;
  error?: string;
  result?: WorkflowResult;
  created_at: string;
  updated_at: string;
}

export interface WorkflowConfig {
  max_retries?: number;
  timeout_minutes?: number;
  parallel_execution?: boolean;
  notification_settings?: NotificationSettings;
  custom_settings?: Record<string, unknown>;
}

export interface NotificationSettings {
  on_success?: boolean;
  on_failure?: boolean;
  on_completion?: boolean;
  webhook_url?: string;
  email_recipients?: string[];
}

export interface WorkflowResult {
  success: boolean;
  data?: Record<string, unknown>;
  errors?: string[];
  warnings?: string[];
  metrics?: WorkflowMetrics;
}

export interface WorkflowMetrics {
  duration_ms: number;
  steps_completed: number;
  steps_failed: number;
  resources_used: Record<string, number>;
}

export interface WorkflowStep {
  id: string;
  name: string;
  status: WorkflowStepStatus;
  started_at?: string;
  completed_at?: string;
  error?: string;
  result?: Record<string, unknown>;
  retry_count: number;
  max_retries: number;
}

export interface DiscoveryWorkflowConfig extends WorkflowConfig {
  site_id: string;
  discovery_strategy: "sitemap" | "list" | "search" | "custom";
  max_pages?: number;
  delay_between_requests_ms?: number;
  respect_robots_txt?: boolean;
  custom_selectors?: Record<string, string>;
}

export interface JobMonitorWorkflowConfig extends WorkflowConfig {
  job_ids: string[];
  check_frequency_hours?: number;
  change_threshold?: number;
  alert_on_status_change?: boolean;
  alert_on_content_change?: boolean;
}

export interface ChangeAnalysisWorkflowConfig extends WorkflowConfig {
  job_id: string;
  old_content: string;
  new_content: string;
  analysis_depth?: "basic" | "detailed" | "comprehensive";
  include_ai_analysis?: boolean;
  generate_summary?: boolean;
}

export interface WorkflowExecution {
  id: string;
  workflow_instance_id: string;
  step_id: string;
  status: WorkflowStepStatus;
  started_at: string;
  completed_at?: string;
  error?: string;
  result?: Record<string, unknown>;
  retry_count: number;
  execution_time_ms?: number;
}

export interface WorkflowLog {
  id: string;
  workflow_instance_id: string;
  step_id?: string;
  level: "debug" | "info" | "warn" | "error";
  message: string;
  data?: Record<string, unknown>;
  timestamp: string;
}

export interface WorkflowStats {
  total_workflows: number;
  running_workflows: number;
  completed_workflows: number;
  failed_workflows: number;
  average_duration_ms: number;
  success_rate_percentage: number;
  error_rate_percentage: number;
  by_type: Record<WorkflowType, WorkflowTypeStats>;
}

export interface WorkflowTypeStats {
  total: number;
  running: number;
  completed: number;
  failed: number;
  average_duration_ms: number;
  success_rate_percentage: number;
}

export interface WorkflowListResponse {
  workflows: WorkflowInstance[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

export interface WorkflowExecutionResponse {
  execution: WorkflowExecution;
  logs: WorkflowLog[];
}

export interface WorkflowStatsResponse {
  stats: WorkflowStats;
  period: {
    start: string;
    end: string;
  };
}

export interface CreateWorkflowRequest {
  type: WorkflowType;
  site_id?: string;
  job_id?: string;
  config: WorkflowConfig;
}

export interface UpdateWorkflowRequest {
  status?: WorkflowStatus;
  config?: Partial<WorkflowConfig>;
  current_step?: string;
  progress?: number;
  error?: string;
  result?: WorkflowResult;
  started_at?: string;
  completed_at?: string;
}

export interface WorkflowStepRequest {
  workflow_instance_id: string;
  step_name: string;
  config?: Record<string, unknown>;
}

export interface WorkflowStepResponse {
  step: WorkflowStep;
  execution: WorkflowExecution;
}

export interface WorkflowLogRequest {
  workflow_instance_id: string;
  step_id?: string;
  level?: "debug" | "info" | "warn" | "error";
  limit?: number;
  offset?: number;
}

export interface WorkflowLogResponse {
  logs: WorkflowLog[];
  total: number;
  has_more: boolean;
}
