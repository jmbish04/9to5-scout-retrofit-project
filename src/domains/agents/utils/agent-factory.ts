/**
 * @fileoverview Agent Factory Utility
 *
 * Factory utility for creating agent instances with proper configuration,
 * dependency injection, and initialization.
 *
 * @author 9to5 Scout AI Team
 * @version 1.0.0
 * @since 2024-01-01
 */

import type {
  AgentConfig,
  AgentFactoryOptions,
  AgentInstance,
} from "../types/agent.types";
import { AgentType } from "../types/agent.types";

// Import agent classes
import { CompanyIntelligenceAgent } from "../company-intelligence-agent";
import { EmailProcessorAgent } from "../email-processor-agent";
import { GenericAgent } from "../generic_agent";
import { InterviewPreparationAgent } from "../interview-preparation-agent";
import { JobMonitorAgent } from "../job-monitor-agent";
import { RAGAgent } from "../rag_agent";
import { ResumeOptimizationAgent } from "../resume-optimization-agent";

/**
 * Agent Factory
 *
 * Centralized factory for creating agent instances with proper configuration
 * and dependency injection.
 *
 * @class AgentFactory
 */
export class AgentFactory {
  private static agentClasses = new Map<AgentType, any>([
    [AgentType.EMAIL_PROCESSOR, EmailProcessorAgent],
    [AgentType.JOB_MONITOR, JobMonitorAgent],
    [AgentType.RESUME_OPTIMIZATION, ResumeOptimizationAgent],
    [AgentType.COMPANY_INTELLIGENCE, CompanyIntelligenceAgent],
    [AgentType.INTERVIEW_PREPARATION, InterviewPreparationAgent],
    [AgentType.GENERIC, GenericAgent],
    [AgentType.RAG, RAGAgent],
  ]);

  /**
   * Creates a new agent instance
   *
   * @param config - Agent configuration
   * @param options - Factory options
   * @returns Promise resolving to agent instance
   */
  static async createAgent(
    config: AgentConfig,
    options: AgentFactoryOptions
  ): Promise<AgentInstance> {
    try {
      // Validate configuration
      AgentFactory.validateConfig(config);

      // Get agent class
      const AgentClass = AgentFactory.agentClasses.get(config.type);
      if (!AgentClass) {
        throw new Error(`Unknown agent type: ${config.type}`);
      }

      // Create agent instance
      const agentInstance = new AgentClass(options.env, config);

      // Initialize agent
      await AgentFactory.initializeAgent(agentInstance, config, options);

      // Create agent instance metadata
      const instance: AgentInstance = {
        config,
        status: "active" as any,
        capabilities: await AgentFactory.getAgentCapabilities(config),
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
   * Creates multiple agent instances
   *
   * @param configs - Array of agent configurations
   * @param options - Factory options
   * @returns Promise resolving to array of agent instances
   */
  static async createAgents(
    configs: AgentConfig[],
    options: AgentFactoryOptions
  ): Promise<AgentInstance[]> {
    const instances: AgentInstance[] = [];

    for (const config of configs) {
      try {
        const instance = await AgentFactory.createAgent(config, options);
        instances.push(instance);
      } catch (error) {
        console.error(`Failed to create agent ${config.id}:`, error);
        // Continue with other agents
      }
    }

    return instances;
  }

  /**
   * Gets available agent types
   *
   * @returns Array of available agent types
   */
  static getAvailableAgentTypes(): AgentType[] {
    return Array.from(AgentFactory.agentClasses.keys());
  }

  /**
   * Checks if an agent type is supported
   *
   * @param type - Agent type to check
   * @returns True if agent type is supported
   */
  static isAgentTypeSupported(type: AgentType): boolean {
    return AgentFactory.agentClasses.has(type);
  }

  /**
   * Validates agent configuration
   *
   * @param config - Agent configuration to validate
   * @throws Error if configuration is invalid
   */
  private static validateConfig(config: AgentConfig): void {
    if (!config.id || !config.name || !config.type) {
      throw new Error("Agent configuration must include id, name, and type");
    }

    if (!config.model || !config.model.id) {
      throw new Error("Agent configuration must include model configuration");
    }

    if (!AgentFactory.isAgentTypeSupported(config.type)) {
      throw new Error(`Unsupported agent type: ${config.type}`);
    }

    if (!config.parameters) {
      throw new Error("Agent configuration must include parameters");
    }
  }

  /**
   * Initializes an agent instance
   *
   * @param agentInstance - Agent instance to initialize
   * @param config - Agent configuration
   * @param options - Factory options
   */
  private static async initializeAgent(
    agentInstance: any,
    config: AgentConfig,
    options: AgentFactoryOptions
  ): Promise<void> {
    try {
      // Call agent initialization if method exists
      if (typeof agentInstance.initialize === "function") {
        await agentInstance.initialize(options.init_params);
      }

      // Inject dependencies if method exists
      if (
        typeof agentInstance.injectDependencies === "function" &&
        options.dependencies
      ) {
        await agentInstance.injectDependencies(options.dependencies);
      }

      // Configure logging if method exists
      if (
        typeof agentInstance.configureLogging === "function" &&
        options.logging
      ) {
        await agentInstance.configureLogging(options.logging);
      }
    } catch (error) {
      throw new Error(
        `Failed to initialize agent: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Gets agent capabilities based on configuration
   *
   * @param config - Agent configuration
   * @returns Agent capabilities
   */
  private static async getAgentCapabilities(config: AgentConfig) {
    // This would be implemented based on agent type and configuration
    // For now, we'll return default capabilities
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
}

/**
 * Creates a new agent instance using the factory
 *
 * @param config - Agent configuration
 * @param options - Factory options
 * @returns Promise resolving to agent instance
 */
export async function createAgentInstance(
  config: AgentConfig,
  options: AgentFactoryOptions
): Promise<AgentInstance> {
  return AgentFactory.createAgent(config, options);
}

/**
 * Creates multiple agent instances using the factory
 *
 * @param configs - Array of agent configurations
 * @param options - Factory options
 * @returns Promise resolving to array of agent instances
 */
export async function createAgentInstances(
  configs: AgentConfig[],
  options: AgentFactoryOptions
): Promise<AgentInstance[]> {
  return AgentFactory.createAgents(configs, options);
}
