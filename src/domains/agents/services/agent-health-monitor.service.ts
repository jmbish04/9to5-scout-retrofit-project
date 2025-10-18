/**
 * @fileoverview Agent Health Monitor Service
 *
 * Monitors the health and performance of all agent instances, providing
 * real-time status updates, alerting, and performance metrics collection.
 *
 * @author 9to5 Scout AI Team
 * @version 1.0.0
 * @since 2024-01-01
 */

import type { Env } from "../../../config/env";
import type {
  AgentEvent,
  AgentHealth,
  AgentInstance,
} from "../types/agent.types";

/**
 * Agent Health Monitor Service
 *
 * Provides comprehensive health monitoring, alerting, and performance
 * tracking for all agent instances in the system.
 *
 * @class AgentHealthMonitor
 */
export class AgentHealthMonitor {
  private env: Env;
  private healthChecks: Map<string, AgentHealth> = new Map();
  private eventListeners: Map<string, (event: AgentEvent) => void> = new Map();
  private monitoringInterval?: NodeJS.Timeout;

  /**
   * Creates a new AgentHealthMonitor instance
   *
   * @param env - Cloudflare Workers environment configuration
   */
  constructor(env: Env) {
    this.env = env;
  }

  /**
   * Starts monitoring all agents
   *
   * @param intervalMs - Health check interval in milliseconds
   */
  startMonitoring(intervalMs: number = 30000): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = setInterval(async () => {
      await this.performHealthChecks();
    }, intervalMs);

    console.log(
      `Agent health monitoring started with ${intervalMs}ms interval`
    );
  }

  /**
   * Stops monitoring agents
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    console.log("Agent health monitoring stopped");
  }

  /**
   * Monitors a specific agent instance
   *
   * @param agent - Agent instance to monitor
   * @returns Promise resolving to health status
   */
  async monitorAgent(agent: AgentInstance): Promise<AgentHealth> {
    const startTime = Date.now();

    try {
      // Perform health checks
      const health = await this.performAgentHealthCheck(agent);

      // Store health status
      this.healthChecks.set(agent.instance_id, health);

      // Emit health event
      this.emitEvent({
        type: "health_check",
        timestamp: new Date().toISOString(),
        agent_id: agent.instance_id,
        data: { health },
        severity: health.status === "unhealthy" ? "error" : "info",
        message: `Agent ${agent.config.name} health check: ${health.status}`,
      });

      return health;
    } catch (error) {
      const health: AgentHealth = {
        instance_id: agent.instance_id,
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        components: {
          model: "unhealthy",
          memory: "unhealthy",
          storage: "unhealthy",
          network: "unhealthy",
        },
        metrics: {
          response_time_ms: Date.now() - startTime,
          memory_usage_mb: 0,
          cpu_usage_percent: 0,
          error_rate: 1.0,
        },
        details: {
          last_error: error instanceof Error ? error.message : "Unknown error",
          consecutive_failures: 1,
          uptime_seconds: 0,
        },
      };

      this.healthChecks.set(agent.instance_id, health);

      // Emit error event
      this.emitEvent({
        type: "health_check_error",
        timestamp: new Date().toISOString(),
        agent_id: agent.instance_id,
        data: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
        severity: "error",
        message: `Health check failed for agent ${agent.config.name}`,
      });

      return health;
    }
  }

  /**
   * Gets health status for a specific agent
   *
   * @param instanceId - Agent instance ID
   * @returns Agent health status or undefined
   */
  getAgentHealth(instanceId: string): AgentHealth | undefined {
    return this.healthChecks.get(instanceId);
  }

  /**
   * Gets health status for all agents
   *
   * @returns Map of agent health statuses
   */
  getAllAgentHealth(): Map<string, AgentHealth> {
    return new Map(this.healthChecks);
  }

  /**
   * Gets agents with unhealthy status
   *
   * @returns Array of unhealthy agent health statuses
   */
  getUnhealthyAgents(): AgentHealth[] {
    return Array.from(this.healthChecks.values()).filter(
      (health) => health.status === "unhealthy"
    );
  }

  /**
   * Gets agents with degraded status
   *
   * @returns Array of degraded agent health statuses
   */
  getDegradedAgents(): AgentHealth[] {
    return Array.from(this.healthChecks.values()).filter(
      (health) => health.status === "degraded"
    );
  }

  /**
   * Gets overall system health
   *
   * @returns Overall system health status
   */
  getSystemHealth() {
    const allHealth = Array.from(this.healthChecks.values());

    if (allHealth.length === 0) {
      return {
        status: "unknown",
        total_agents: 0,
        healthy_agents: 0,
        degraded_agents: 0,
        unhealthy_agents: 0,
        overall_uptime: 0,
        average_response_time: 0,
      };
    }

    const healthy = allHealth.filter((h) => h.status === "healthy").length;
    const degraded = allHealth.filter((h) => h.status === "degraded").length;
    const unhealthy = allHealth.filter((h) => h.status === "unhealthy").length;

    const overallStatus =
      unhealthy > 0 ? "unhealthy" : degraded > 0 ? "degraded" : "healthy";

    const averageResponseTime =
      allHealth.reduce((sum, h) => sum + h.metrics.response_time_ms, 0) /
      allHealth.length;

    return {
      status: overallStatus,
      total_agents: allHealth.length,
      healthy_agents: healthy,
      degraded_agents: degraded,
      unhealthy_agents: unhealthy,
      overall_uptime: this.calculateOverallUptime(allHealth),
      average_response_time: averageResponseTime,
      last_check: new Date().toISOString(),
    };
  }

  /**
   * Adds an event listener for agent events
   *
   * @param eventType - Event type to listen for
   * @param listener - Event listener function
   */
  addEventListener(
    eventType: string,
    listener: (event: AgentEvent) => void
  ): void {
    this.eventListeners.set(eventType, listener);
  }

  /**
   * Removes an event listener
   *
   * @param eventType - Event type to remove listener for
   */
  removeEventListener(eventType: string): void {
    this.eventListeners.delete(eventType);
  }

  /**
   * Performs health checks on all agents
   */
  private async performHealthChecks(): Promise<void> {
    // This would get all active agents from the agent manager
    // For now, we'll just log the action
    console.log("Performing health checks on all agents");
  }

  /**
   * Performs health check on a specific agent
   *
   * @param agent - Agent instance to check
   * @returns Agent health status
   */
  private async performAgentHealthCheck(
    agent: AgentInstance
  ): Promise<AgentHealth> {
    const now = new Date();
    const uptime = Math.floor(
      (now.getTime() - new Date(agent.started_at).getTime()) / 1000
    );

    // Check model health (this would be a real check)
    const modelHealth = await this.checkModelHealth(agent);

    // Check memory health (this would be a real check)
    const memoryHealth = await this.checkMemoryHealth(agent);

    // Check storage health (this would be a real check)
    const storageHealth = await this.checkStorageHealth(agent);

    // Check network health (this would be a real check)
    const networkHealth = await this.checkNetworkHealth(agent);

    // Determine overall health status
    const componentStatuses = [
      modelHealth,
      memoryHealth,
      storageHealth,
      networkHealth,
    ];
    const unhealthyCount = componentStatuses.filter(
      (status) => status === "unhealthy"
    ).length;
    const degradedCount = componentStatuses.filter(
      (status) => status === "degraded"
    ).length;

    let overallStatus: "healthy" | "degraded" | "unhealthy";
    if (unhealthyCount > 0) {
      overallStatus = "unhealthy";
    } else if (degradedCount > 0) {
      overallStatus = "degraded";
    } else {
      overallStatus = "healthy";
    }

    return {
      instance_id: agent.instance_id,
      status: overallStatus,
      timestamp: now.toISOString(),
      components: {
        model: modelHealth,
        memory: memoryHealth,
        storage: storageHealth,
        network: networkHealth,
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
   * Checks model health for an agent
   *
   * @param agent - Agent instance
   * @returns Model health status
   */
  private async checkModelHealth(
    agent: AgentInstance
  ): Promise<"healthy" | "degraded" | "unhealthy"> {
    try {
      // This would perform an actual model health check
      // For now, we'll simulate a check
      await new Promise((resolve) => setTimeout(resolve, 10));
      return "healthy";
    } catch (error) {
      return "unhealthy";
    }
  }

  /**
   * Checks memory health for an agent
   *
   * @param agent - Agent instance
   * @returns Memory health status
   */
  private async checkMemoryHealth(
    agent: AgentInstance
  ): Promise<"healthy" | "degraded" | "unhealthy"> {
    try {
      // This would check actual memory usage
      // For now, we'll simulate a check
      return "healthy";
    } catch (error) {
      return "unhealthy";
    }
  }

  /**
   * Checks storage health for an agent
   *
   * @param agent - Agent instance
   * @returns Storage health status
   */
  private async checkStorageHealth(
    agent: AgentInstance
  ): Promise<"healthy" | "degraded" | "unhealthy"> {
    try {
      // This would check storage connectivity and availability
      // For now, we'll simulate a check
      return "healthy";
    } catch (error) {
      return "unhealthy";
    }
  }

  /**
   * Checks network health for an agent
   *
   * @param agent - Agent instance
   * @returns Network health status
   */
  private async checkNetworkHealth(
    agent: AgentInstance
  ): Promise<"healthy" | "degraded" | "unhealthy"> {
    try {
      // This would check network connectivity
      // For now, we'll simulate a check
      return "healthy";
    } catch (error) {
      return "unhealthy";
    }
  }

  /**
   * Calculates overall system uptime
   *
   * @param healthStatuses - Array of agent health statuses
   * @returns Overall uptime percentage
   */
  private calculateOverallUptime(healthStatuses: AgentHealth[]): number {
    if (healthStatuses.length === 0) return 0;

    const totalUptime = healthStatuses.reduce((sum, health) => {
      return sum + (health.details.uptime_seconds || 0);
    }, 0);

    const maxUptime = healthStatuses.length * 86400; // 24 hours per agent
    return Math.min((totalUptime / maxUptime) * 100, 100);
  }

  /**
   * Emits an agent event
   *
   * @param event - Event to emit
   */
  private emitEvent(event: AgentEvent): void {
    const listener = this.eventListeners.get(event.type);
    if (listener) {
      try {
        listener(event);
      } catch (error) {
        console.error(`Error in event listener for ${event.type}:`, error);
      }
    }
  }
}
