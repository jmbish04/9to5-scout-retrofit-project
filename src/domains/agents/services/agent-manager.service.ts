/**
 * @fileoverview Agent Manager Service
 *
 * Centralized service for managing AI agent lifecycle, including creation,
 * configuration, monitoring, and cleanup of agent instances.
 *
 * @author 9to5 Scout AI Team
 * @version 1.0.0
 * @since 2024-01-01
 */

import type { Env } from "../../../config/env";
import type {
  AgentConfig,
  AgentFactoryOptions,
  AgentInstance,
  AgentRequest,
  AgentResponse,
} from "../types/agent.types";
import { AgentStatus } from "../types/agent.types";

/**
 * Agent Manager Service
 *
 * Provides comprehensive agent lifecycle management including creation,
 * configuration, monitoring, and cleanup of agent instances.
 *
 * @class AgentManager
 */
export class AgentManager {
  private agents: Map<string, AgentInstance> = new Map();
  private env: Env;

  /**
   * Creates a new AgentManager instance
   *
   * @param env - Cloudflare Workers environment configuration
   */
  constructor(env: Env) {
    this.env = env;
  }

  /**
   * Creates a new agent instance
   *
   * @param config - Agent configuration
   * @param options - Factory options
   * @returns Promise resolving to agent instance
   */
  async createAgent(
    config: AgentConfig,
    options?: Partial<AgentFactoryOptions>
  ): Promise<AgentInstance> {
    try {
      // Validate configuration
      this.validateAgentConfig(config);

      // Create agent instance
      const instance: AgentInstance = {
        config,
        status: AgentStatus.INITIALIZING,
        capabilities: await this.getAgentCapabilities(config),
        instance_id: crypto.randomUUID(),
        started_at: new Date().toISOString(),
        last_activity: new Date().toISOString(),
        metrics: {
          total_requests: 0,
          successful_requests: 0,
          failed_requests: 0,
          average_response_time_ms: 0,
          uptime_seconds: 0,
        },
      };

      // Store instance
      this.agents.set(instance.instance_id, instance);

      // Initialize agent
      await this.initializeAgent(instance, options);

      // Update status
      instance.status = AgentStatus.ACTIVE;

      return instance;
    } catch (error) {
      throw new Error(
        `Failed to create agent: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Gets an agent instance by ID
   *
   * @param instanceId - Agent instance ID
   * @returns Agent instance or undefined
   */
  getAgent(instanceId: string): AgentInstance | undefined {
    return this.agents.get(instanceId);
  }

  /**
   * Gets all agent instances
   *
   * @returns Array of all agent instances
   */
  getAllAgents(): AgentInstance[] {
    return Array.from(this.agents.values());
  }

  /**
   * Gets agents by type
   *
   * @param type - Agent type
   * @returns Array of agents of specified type
   */
  getAgentsByType(type: string): AgentInstance[] {
    return this.getAllAgents().filter((agent) => agent.config.type === type);
  }

  /**
   * Executes a request on an agent
   *
   * @param instanceId - Agent instance ID
   * @param request - Agent request
   * @returns Promise resolving to agent response
   */
  async executeRequest<T = any>(
    instanceId: string,
    request: AgentRequest<T>
  ): Promise<AgentResponse> {
    const agent = this.getAgent(instanceId);
    if (!agent) {
      throw new Error(`Agent instance ${instanceId} not found`);
    }

    if (agent.status !== AgentStatus.ACTIVE) {
      throw new Error(
        `Agent instance ${instanceId} is not active (status: ${agent.status})`
      );
    }

    const startTime = Date.now();

    try {
      // Update agent status
      agent.status = AgentStatus.PROCESSING;
      agent.last_activity = new Date().toISOString();

      // Execute request (this would be implemented by specific agent types)
      const response = await this.executeAgentRequest(agent, request);

      // Update metrics
      const processingTime = Date.now() - startTime;
      this.updateAgentMetrics(agent, true, processingTime);

      return response;
    } catch (error) {
      // Update metrics
      const processingTime = Date.now() - startTime;
      this.updateAgentMetrics(agent, false, processingTime);

      // Update status
      agent.status = AgentStatus.ERROR;

      throw error;
    } finally {
      // Reset status if not in error
      if (agent.status === AgentStatus.PROCESSING) {
        agent.status = AgentStatus.ACTIVE;
      }
    }
  }

  /**
   * Stops an agent instance
   *
   * @param instanceId - Agent instance ID
   * @returns Promise resolving when agent is stopped
   */
  async stopAgent(instanceId: string): Promise<void> {
    const agent = this.getAgent(instanceId);
    if (!agent) {
      throw new Error(`Agent instance ${instanceId} not found`);
    }

    try {
      // Perform cleanup
      await this.cleanupAgent(agent);

      // Update status
      agent.status = AgentStatus.STOPPED;

      // Remove from registry
      this.agents.delete(instanceId);
    } catch (error) {
      throw new Error(
        `Failed to stop agent: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Gets agent health status
   *
   * @param instanceId - Agent instance ID
   * @returns Agent health status
   */
  async getAgentHealth(instanceId: string) {
    const agent = this.getAgent(instanceId);
    if (!agent) {
      throw new Error(`Agent instance ${instanceId} not found`);
    }

    const now = new Date();
    const uptime = Math.floor(
      (now.getTime() - new Date(agent.started_at).getTime()) / 1000
    );

    return {
      instance_id: instanceId,
      status: this.determineHealthStatus(agent),
      timestamp: now.toISOString(),
      components: {
        model: "healthy", // This would check actual model health
        memory: "healthy", // This would check memory usage
        storage: "healthy", // This would check storage health
        network: "healthy", // This would check network connectivity
      },
      metrics: {
        response_time_ms: agent.metrics.average_response_time_ms,
        memory_usage_mb: 0, // This would get actual memory usage
        cpu_usage_percent: 0, // This would get actual CPU usage
        error_rate:
          agent.metrics.failed_requests /
          Math.max(agent.metrics.total_requests, 1),
      },
      details: {
        last_successful_request: agent.last_activity,
        last_error: undefined, // This would track last error
        consecutive_failures: 0, // This would track consecutive failures
        uptime_seconds: uptime,
      },
    };
  }

  /**
   * Validates agent configuration
   *
   * @param config - Agent configuration to validate
   * @throws Error if configuration is invalid
   */
  private validateAgentConfig(config: AgentConfig): void {
    if (!config.id || !config.name || !config.type) {
      throw new Error("Agent configuration must include id, name, and type");
    }

    if (!config.model || !config.model.id) {
      throw new Error("Agent configuration must include model configuration");
    }

    if (!config.parameters) {
      throw new Error("Agent configuration must include parameters");
    }
  }

  /**
   * Gets agent capabilities based on configuration
   *
   * @param config - Agent configuration
   * @returns Agent capabilities
   */
  private async getAgentCapabilities(config: AgentConfig) {
    // This would be implemented based on agent type
    return {
      input_formats: ["text", "json"],
      output_formats: ["text", "json"],
      max_concurrent: 10,
      operations: ["process", "analyze", "generate"],
      permissions: ["read", "write"],
      resources: {
        memory_mb: 512,
        cpu_cores: 1,
        storage_mb: 100,
      },
    };
  }

  /**
   * Initializes an agent instance
   *
   * @param instance - Agent instance to initialize
   * @param options - Initialization options
   */
  private async initializeAgent(
    instance: AgentInstance,
    options?: Partial<AgentFactoryOptions>
  ): Promise<void> {
    // This would perform agent-specific initialization
    // For now, we'll just simulate initialization
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  /**
   * Executes a request on a specific agent
   *
   * @param agent - Agent instance
   * @param request - Request to execute
   * @returns Agent response
   */
  private async executeAgentRequest<T = any>(
    agent: AgentInstance,
    request: AgentRequest<T>
  ): Promise<AgentResponse> {
    // This would be implemented by specific agent types
    // For now, we'll return a mock response
    return {
      success: true,
      data: { message: "Request processed successfully" },
      metadata: {
        agent_id: agent.config.id,
        agent_name: agent.config.name,
        timestamp: new Date().toISOString(),
        processing_time_ms: 0,
        model_used: agent.config.model.id,
      },
    };
  }

  /**
   * Updates agent metrics after request execution
   *
   * @param agent - Agent instance
   * @param success - Whether the request was successful
   * @param processingTime - Request processing time in milliseconds
   */
  private updateAgentMetrics(
    agent: AgentInstance,
    success: boolean,
    processingTime: number
  ): void {
    agent.metrics.total_requests++;

    if (success) {
      agent.metrics.successful_requests++;
    } else {
      agent.metrics.failed_requests++;
    }

    // Update average response time
    const totalTime =
      agent.metrics.average_response_time_ms *
      (agent.metrics.total_requests - 1);
    agent.metrics.average_response_time_ms =
      (totalTime + processingTime) / agent.metrics.total_requests;
  }

  /**
   * Determines agent health status
   *
   * @param agent - Agent instance
   * @returns Health status
   */
  private determineHealthStatus(
    agent: AgentInstance
  ): "healthy" | "degraded" | "unhealthy" {
    if (agent.status === AgentStatus.ERROR) {
      return "unhealthy";
    }

    if (agent.status === AgentStatus.MAINTENANCE) {
      return "degraded";
    }

    const errorRate =
      agent.metrics.failed_requests / Math.max(agent.metrics.total_requests, 1);
    if (errorRate > 0.1) {
      return "degraded";
    }

    return "healthy";
  }

  /**
   * Performs agent cleanup
   *
   * @param agent - Agent instance to cleanup
   */
  private async cleanupAgent(agent: AgentInstance): Promise<void> {
    // This would perform agent-specific cleanup
    // For now, we'll just simulate cleanup
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}
