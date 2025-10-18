/**
 * Workflows Domain
 *
 * Exports all workflow-related types, schemas, services, and routes.
 * This domain handles workflow management, execution, and monitoring.
 */

// Export types
export * from "./types/workflow.types";

// Export schemas
export {
  ChangeAnalysisWorkflowConfigSchema,
  CreateWorkflowRequestSchema,
  DiscoveryWorkflowConfigSchema,
  JobMonitorWorkflowConfigSchema,
  NotificationSettingsSchema,
  UpdateWorkflowRequestSchema,
  WorkflowConfigSchema,
  WorkflowExecutionResponseSchema,
  WorkflowExecutionSchema,
  WorkflowInstanceSchema,
  WorkflowListResponseSchema,
  WorkflowLogRequestSchema,
  WorkflowLogResponseSchema,
  WorkflowLogSchema,
  WorkflowMetricsSchema,
  WorkflowResultSchema,
  WorkflowStatsResponseSchema,
  WorkflowStatsSchema,
  WorkflowStepRequestSchema,
  WorkflowStepResponseSchema,
  WorkflowStepSchema,
  WorkflowTypeStatsSchema,
  type ChangeAnalysisWorkflowConfig,
  type CreateWorkflowRequest,
  type DiscoveryWorkflowConfig,
  type JobMonitorWorkflowConfig,
  type NotificationSettings,
  type UpdateWorkflowRequest,
  type WorkflowConfig,
  type WorkflowExecution,
  type WorkflowExecutionResponse,
  type WorkflowInstance,
  type WorkflowListResponse,
  type WorkflowLog,
  type WorkflowLogRequest,
  type WorkflowLogResponse,
  type WorkflowMetrics,
  type WorkflowResult,
  type WorkflowStats,
  type WorkflowStatsResponse,
  type WorkflowStatus,
  type WorkflowStep,
  type WorkflowStepRequest,
  type WorkflowStepResponse,
  type WorkflowStepStatus,
  type WorkflowType,
  type WorkflowTypeStats,
} from "./models/workflow.schema";

// Export services
export {
  WorkflowService,
  createWorkflowService,
} from "./services/workflow.service";

// Export workflow classes
export { ChangeAnalysisWorkflow } from "./workflow-classes/change-analysis-workflow";
export { DiscoveryWorkflow } from "./workflow-classes/discovery-workflow";
export { JobMonitorWorkflow } from "./workflow-classes/job-monitor-workflow";

// Export routes
export { default as workflowRoutes } from "./routes/workflow.routes";
