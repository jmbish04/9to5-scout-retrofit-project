/**
 * @fileoverview Agent Types and Interfaces
 * 
 * Defines comprehensive TypeScript types and interfaces for the AI agent system,
 * ensuring type safety and clear contracts between agent components.
 * 
 * @author 9to5 Scout AI Team
 * @version 1.0.0
 * @since 2024-01-01
 */

import type { Env } from "../../../config/env";

/**
 * Core agent configuration interface
 * 
 * Defines the essential configuration parameters required to initialize
 * and operate any AI agent within the system.
 */
export interface AgentConfig {
  /** Unique identifier for the agent instance */
  id: string;
  
  /** Human-readable name of the agent */
  name: string;
  
  /** Detailed description of the agent's purpose and capabilities */
  description: string;
  
  /** Agent type/category for organizational purposes */
  type: AgentType;
  
  /** AI model configuration for this agent */
  model: {
    /** Model identifier (e.g., "@cf/meta/llama-3.1-8b-instruct") */
    id: string;
    /** Model-specific parameters */
    parameters?: Record<string, any>;
  };
  
  /** Agent-specific configuration parameters */
  parameters: Record<string, any>;
  
  /** Whether the agent is currently active */
  active: boolean;
  
  /** Creation timestamp */
  created_at: string;
  
  /** Last update timestamp */
  updated_at: string;
}

/**
 * Agent type enumeration
 * 
 * Categorizes agents by their primary function within the system.
 */
export enum AgentType {
  EMAIL_PROCESSOR = "email_processor",
  JOB_MONITOR = "job_monitor",
  RESUME_OPTIMIZATION = "resume_optimization",
  COMPANY_INTELLIGENCE = "company_intelligence",
  INTERVIEW_PREPARATION = "interview_preparation",
  MARKET_ANALYST = "market_analyst",
  INTERVIEW_COACH = "interview_coach",
  GENERIC = "generic",
  RAG = "rag",
}

/**
 * Standard agent response interface
 * 
 * Provides a consistent response format for all agent operations,
 * ensuring predictable communication patterns across the system.
 */
export interface AgentResponse<T = any> {
  /** Whether the operation was successful */
  success: boolean;
  
  /** Response data payload */
  data?: T;
  
  /** Error information if operation failed */
  error?: AgentError;
  
  /** Agent metadata */
  metadata: {
    agent_id: string;
    agent_name: string;
    timestamp: string;
    processing_time_ms: number;
    model_used: string;
  };
}

/**
 * Agent error interface
 * 
 * Standardized error format for agent operations, providing
 * detailed error information for debugging and monitoring.
 */
export interface AgentError {
  /** Error code for programmatic handling */
  code: string;
  
  /** Human-readable error message */
  message: string;
  
  /** Detailed error description */
  details?: string;
  
  /** Stack trace for debugging */
  stack?: string;
  
  /** Additional error context */
  context?: Record<string, any>;
}

/**
 * Agent status enumeration
 * 
 * Represents the current operational state of an agent.
 */
export enum AgentStatus {
  INITIALIZING = "initializing",
  ACTIVE = "active",
  IDLE = "idle",
  PROCESSING = "processing",
  ERROR = "error",
  STOPPED = "stopped",
  MAINTENANCE = "maintenance",
}

/**
 * Agent capabilities interface
 * 
 * Defines what operations and features an agent supports,
 * enabling dynamic capability discovery and routing.
 */
export interface AgentCapabilities {
  /** Supported input formats */
  input_formats: string[];
  
  /** Supported output formats */
  output_formats: string[];
  
  /** Maximum concurrent operations */
  max_concurrent: number;
  
  /** Supported operation types */
  operations: string[];
  
  /** Required permissions */
  permissions: string[];
  
  /** Resource requirements */
  resources: {
    memory_mb: number;
    cpu_cores: number;
    storage_mb: number;
  };
}

/**
 * Agent instance interface
 * 
 * Represents a running agent instance with its current state
 * and operational metadata.
 */
export interface AgentInstance {
  /** Agent configuration */
  config: AgentConfig;
  
  /** Current status */
  status: AgentStatus;
  
  /** Current capabilities */
  capabilities: AgentCapabilities;
  
  /** Instance metadata */
  instance_id: string;
  
  /** Start timestamp */
  started_at: string;
  
  /** Last activity timestamp */
  last_activity: string;
  
  /** Performance metrics */
  metrics: {
    total_requests: number;
    successful_requests: number;
    failed_requests: number;
    average_response_time_ms: number;
    uptime_seconds: number;
  };
}

/**
 * Agent request interface
 * 
 * Standardized request format for agent operations.
 */
export interface AgentRequest<T = any> {
  /** Request identifier */
  request_id: string;
  
  /** Target agent ID */
  agent_id: string;
  
  /** Operation type */
  operation: string;
  
  /** Request payload */
  payload: T;
  
  /** Request metadata */
  metadata: {
    user_id?: string;
    session_id?: string;
    timestamp: string;
    priority: "low" | "normal" | "high" | "urgent";
    timeout_ms?: number;
  };
}

/**
 * Agent health check interface
 * 
 * Provides health status information for agent monitoring.
 */
export interface AgentHealth {
  /** Agent instance ID */
  instance_id: string;
  
  /** Overall health status */
  status: "healthy" | "degraded" | "unhealthy";
  
  /** Health check timestamp */
  timestamp: string;
  
  /** Component health status */
  components: {
    model: "healthy" | "degraded" | "unhealthy";
    memory: "healthy" | "degraded" | "unhealthy";
    storage: "healthy" | "degraded" | "unhealthy";
    network: "healthy" | "degraded" | "unhealthy";
  };
  
  /** Performance metrics */
  metrics: {
    response_time_ms: number;
    memory_usage_mb: number;
    cpu_usage_percent: number;
    error_rate: number;
  };
  
  /** Health check details */
  details: {
    last_successful_request?: string;
    last_error?: string;
    consecutive_failures: number;
    uptime_seconds: number;
  };
}

/**
 * Agent registry entry interface
 * 
 * Represents an agent entry in the system registry.
 */
export interface AgentRegistryEntry {
  /** Agent configuration */
  config: AgentConfig;
  
  /** Agent class reference */
  agent_class: string;
  
  /** Dependencies */
  dependencies: string[];
  
  /** Registration timestamp */
  registered_at: string;
  
  /** Last update timestamp */
  updated_at: string;
  
  /** Registry metadata */
  metadata: {
    version: string;
    author: string;
    description: string;
    tags: string[];
  };
}

/**
 * Agent factory options interface
 * 
 * Configuration options for creating new agent instances.
 */
export interface AgentFactoryOptions {
  /** Environment configuration */
  env: Env;
  
  /** Agent configuration */
  config: AgentConfig;
  
  /** Custom initialization parameters */
  init_params?: Record<string, any>;
  
  /** Dependencies to inject */
  dependencies?: Record<string, any>;
  
  /** Logging configuration */
  logging?: {
    level: "debug" | "info" | "warn" | "error";
    enable_metrics: boolean;
  };
}

/**
 * Agent event interface
 * 
 * Represents events emitted by agents for monitoring and debugging.
 */
export interface AgentEvent {
  /** Event type */
  type: string;
  
  /** Event timestamp */
  timestamp: string;
  
  /** Agent instance ID */
  agent_id: string;
  
  /** Event data */
  data: Record<string, any>;
  
  /** Event severity */
  severity: "debug" | "info" | "warn" | "error" | "critical";
  
  /** Event message */
  message: string;
}
