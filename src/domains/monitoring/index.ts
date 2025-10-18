/**
 * Monitoring Domain
 *
 * Exports all monitoring-related types, schemas, services, and routes.
 * This domain handles job monitoring, statistics, and monitoring configuration.
 */

// Export types
export * from "./types/monitoring.types";

// Export schemas
export {
    CreateAlertRequestSchema,
    CreateJobMonitoringRequestSchema,
    CreateMonitoringConfigRequestSchema,
    DailyMonitoringResultSchema,
    JobMonitoringConfigSchema,
    JobMonitoringResponseSchema,
    JobMonitoringStatusSchema,
    MonitoringAlertSchema,
    MonitoringConfigSchema,
    MonitoringDashboardResponseSchema, MonitoringErrorSchema, MonitoringReportResponseSchema, MonitoringStatsSchema,
    UpdateAlertRequestSchema,
    UpdateJobMonitoringRequestSchema,
    UpdateMonitoringConfigRequestSchema,
    type CreateAlertRequest,
    type CreateJobMonitoringRequest,
    type CreateMonitoringConfigRequest,
    type DailyMonitoringResult,
    type JobMonitoringConfig,
    type JobMonitoringResponse,
    type JobMonitoringStatus,
    type MonitoringAlert,
    type MonitoringConfig,
    type MonitoringDashboardResponse,
    type MonitoringError,
    type MonitoringReportResponse,
    type MonitoringStats,
    type UpdateAlertRequest,
    type UpdateJobMonitoringRequest,
    type UpdateMonitoringConfigRequest
} from "./models/monitoring.schema";

// Export services
export {
    MonitoringService,
    createMonitoringService
} from "./services/monitoring.service";

// Export routes
export { default as monitoringRoutes } from "./routes/monitoring.routes";
