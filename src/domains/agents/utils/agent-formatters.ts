/**
 * @fileoverview Agent Formatters Utility
 * 
 * Utility functions for formatting agent responses, errors, and data
 * to ensure consistent output formats across all agents.
 * 
 * @author 9to5 Scout AI Team
 * @version 1.0.0
 * @since 2024-01-01
 */

import type {
  AgentResponse,
  AgentError,
  AgentRequest,
  AgentInstance,
  AgentHealth,
} from "../types/agent.types";

/**
 * Formats a successful agent response
 * 
 * @param data - Response data
 * @param agentId - Agent ID
 * @param agentName - Agent name
 * @param processingTime - Processing time in milliseconds
 * @param modelUsed - Model used for processing
 * @returns Formatted agent response
 */
export function formatAgentResponse<T = any>(
  data: T,
  agentId: string,
  agentName: string,
  processingTime: number = 0,
  modelUsed: string = "unknown"
): AgentResponse<T> {
  return {
    success: true,
    data,
    metadata: {
      agent_id: agentId,
      agent_name: agentName,
      timestamp: new Date().toISOString(),
      processing_time_ms: processingTime,
      model_used: modelUsed,
    },
  };
}

/**
 * Formats an error agent response
 * 
 * @param error - Error information
 * @param agentId - Agent ID
 * @param agentName - Agent name
 * @param processingTime - Processing time in milliseconds
 * @param modelUsed - Model used for processing
 * @returns Formatted error response
 */
export function formatAgentError(
  error: Error | string,
  agentId: string,
  agentName: string,
  processingTime: number = 0,
  modelUsed: string = "unknown"
): AgentResponse {
  const agentError: AgentError = typeof error === 'string' 
    ? {
        code: "AGENT_ERROR",
        message: error,
        details: undefined,
        stack: undefined,
        context: undefined,
      }
    : {
        code: "AGENT_ERROR",
        message: error.message,
        details: error.stack,
        stack: error.stack,
        context: {
          name: error.name,
        },
      };

  return {
    success: false,
    error: agentError,
    metadata: {
      agent_id: agentId,
      agent_name: agentName,
      timestamp: new Date().toISOString(),
      processing_time_ms: processingTime,
      model_used: modelUsed,
    },
  };
}

/**
 * Formats a timeout error response
 * 
 * @param agentId - Agent ID
 * @param agentName - Agent name
 * @param timeoutMs - Timeout duration in milliseconds
 * @returns Formatted timeout error response
 */
export function formatTimeoutError(
  agentId: string,
  agentName: string,
  timeoutMs: number
): AgentResponse {
  return formatAgentError(
    `Request timed out after ${timeoutMs}ms`,
    agentId,
    agentName,
    timeoutMs
  );
}

/**
 * Formats a validation error response
 * 
 * @param validationError - Validation error message
 * @param agentId - Agent ID
 * @param agentName - Agent name
 * @returns Formatted validation error response
 */
export function formatValidationError(
  validationError: string,
  agentId: string,
  agentName: string
): AgentResponse {
  return formatAgentError(
    `Validation error: ${validationError}`,
    agentId,
    agentName
  );
}

/**
 * Formats agent instance information for API responses
 * 
 * @param instance - Agent instance
 * @returns Formatted agent instance data
 */
export function formatAgentInstance(instance: AgentInstance) {
  return {
    instance_id: instance.instance_id,
    config: {
      id: instance.config.id,
      name: instance.config.name,
      description: instance.config.description,
      type: instance.config.type,
      active: instance.config.active,
    },
    status: instance.status,
    capabilities: instance.capabilities,
    started_at: instance.started_at,
    last_activity: instance.last_activity,
    metrics: {
      total_requests: instance.metrics.total_requests,
      successful_requests: instance.metrics.successful_requests,
      failed_requests: instance.metrics.failed_requests,
      success_rate: instance.metrics.total_requests > 0 
        ? (instance.metrics.successful_requests / instance.metrics.total_requests) * 100 
        : 0,
      average_response_time_ms: instance.metrics.average_response_time_ms,
      uptime_seconds: instance.metrics.uptime_seconds,
    },
  };
}

/**
 * Formats agent health information for API responses
 * 
 * @param health - Agent health data
 * @returns Formatted agent health data
 */
export function formatAgentHealth(health: AgentHealth) {
  return {
    instance_id: health.instance_id,
    status: health.status,
    timestamp: health.timestamp,
    components: health.components,
    metrics: {
      response_time_ms: health.metrics.response_time_ms,
      memory_usage_mb: health.metrics.memory_usage_mb,
      cpu_usage_percent: health.metrics.cpu_usage_percent,
      error_rate: health.metrics.error_rate,
    },
    details: {
      last_successful_request: health.details.last_successful_request,
      consecutive_failures: health.details.consecutive_failures,
      uptime_seconds: health.details.uptime_seconds,
    },
  };
}

/**
 * Formats agent request for logging
 * 
 * @param request - Agent request
 * @returns Formatted request for logging
 */
export function formatAgentRequestForLogging(request: AgentRequest) {
  return {
    request_id: request.request_id,
    agent_id: request.agent_id,
    operation: request.operation,
    payload_type: typeof request.payload,
    payload_size: JSON.stringify(request.payload).length,
    metadata: {
      user_id: request.metadata.user_id,
      session_id: request.metadata.session_id,
      timestamp: request.metadata.timestamp,
      priority: request.metadata.priority,
      timeout_ms: request.metadata.timeout_ms,
    },
  };
}

/**
 * Formats agent response for logging
 * 
 * @param response - Agent response
 * @returns Formatted response for logging
 */
export function formatAgentResponseForLogging(response: AgentResponse) {
  return {
    success: response.success,
    data_type: response.data ? typeof response.data : undefined,
    data_size: response.data ? JSON.stringify(response.data).length : 0,
    error: response.error ? {
      code: response.error.code,
      message: response.error.message,
    } : undefined,
    metadata: {
      agent_id: response.metadata.agent_id,
      agent_name: response.metadata.agent_name,
      timestamp: response.metadata.timestamp,
      processing_time_ms: response.metadata.processing_time_ms,
      model_used: response.metadata.model_used,
    },
  };
}

/**
 * Formats error for user display
 * 
 * @param error - Error to format
 * @returns User-friendly error message
 */
export function formatErrorForUser(error: Error | string): string {
  if (typeof error === 'string') {
    return error;
  }

  // Map common error types to user-friendly messages
  const errorMappings: Record<string, string> = {
    'ValidationError': 'The request data is invalid. Please check your input and try again.',
    'TimeoutError': 'The request took too long to process. Please try again.',
    'NetworkError': 'There was a network issue. Please check your connection and try again.',
    'AuthenticationError': 'Authentication failed. Please check your credentials.',
    'AuthorizationError': 'You do not have permission to perform this action.',
    'NotFoundError': 'The requested resource was not found.',
    'RateLimitError': 'Too many requests. Please wait a moment and try again.',
    'InternalError': 'An internal error occurred. Please try again later.',
  };

  const errorType = error.constructor.name;
  return errorMappings[errorType] || error.message || 'An unexpected error occurred.';
}

/**
 * Formats processing time for display
 * 
 * @param processingTimeMs - Processing time in milliseconds
 * @returns Formatted processing time string
 */
export function formatProcessingTime(processingTimeMs: number): string {
  if (processingTimeMs < 1000) {
    return `${processingTimeMs}ms`;
  } else if (processingTimeMs < 60000) {
    return `${(processingTimeMs / 1000).toFixed(1)}s`;
  } else {
    const minutes = Math.floor(processingTimeMs / 60000);
    const seconds = Math.floor((processingTimeMs % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }
}

/**
 * Formats uptime for display
 * 
 * @param uptimeSeconds - Uptime in seconds
 * @returns Formatted uptime string
 */
export function formatUptime(uptimeSeconds: number): string {
  const days = Math.floor(uptimeSeconds / 86400);
  const hours = Math.floor((uptimeSeconds % 86400) / 3600);
  const minutes = Math.floor((uptimeSeconds % 3600) / 60);
  const seconds = uptimeSeconds % 60;

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Formats memory usage for display
 * 
 * @param memoryBytes - Memory usage in bytes
 * @returns Formatted memory usage string
 */
export function formatMemoryUsage(memoryBytes: number): string {
  if (memoryBytes < 1024) {
    return `${memoryBytes}B`;
  } else if (memoryBytes < 1024 * 1024) {
    return `${(memoryBytes / 1024).toFixed(1)}KB`;
  } else if (memoryBytes < 1024 * 1024 * 1024) {
    return `${(memoryBytes / (1024 * 1024)).toFixed(1)}MB`;
  } else {
    return `${(memoryBytes / (1024 * 1024 * 1024)).toFixed(1)}GB`;
  }
}

/**
 * Formats success rate for display
 * 
 * @param successRate - Success rate as decimal (0-1)
 * @returns Formatted success rate string
 */
export function formatSuccessRate(successRate: number): string {
  const percentage = (successRate * 100).toFixed(1);
  return `${percentage}%`;
}

/**
 * Formats error rate for display
 * 
 * @param errorRate - Error rate as decimal (0-1)
 * @returns Formatted error rate string
 */
export function formatErrorRate(errorRate: number): string {
  const percentage = (errorRate * 100).toFixed(1);
  return `${percentage}%`;
}

/**
 * Formats agent status for display
 * 
 * @param status - Agent status
 * @returns Formatted status string
 */
export function formatAgentStatus(status: string): string {
  const statusMappings: Record<string, string> = {
    'initializing': 'Initializing',
    'active': 'Active',
    'idle': 'Idle',
    'processing': 'Processing',
    'error': 'Error',
    'stopped': 'Stopped',
    'maintenance': 'Maintenance',
  };

  return statusMappings[status] || status;
}

/**
 * Formats health status for display
 * 
 * @param healthStatus - Health status
 * @returns Formatted health status string
 */
export function formatHealthStatus(healthStatus: string): string {
  const statusMappings: Record<string, string> = {
    'healthy': 'Healthy',
    'degraded': 'Degraded',
    'unhealthy': 'Unhealthy',
  };

  return statusMappings[healthStatus] || healthStatus;
}
