/**
 * @fileoverview Agent Registry Service
 *
 * Centralized registry for managing agent configurations, types, and metadata.
 * Provides discovery, registration, and lookup capabilities for all available agents.
 *
 * @author 9to5 Scout AI Team
 * @version 1.0.0
 * @since 2024-01-01
 */

import type { Env } from "../../../config/env";
import type { AgentRegistryEntry } from "../types/agent.types";
import { AgentType } from "../types/agent.types";

/**
 * Agent Registry Service
 *
 * Manages the registration, discovery, and metadata of all available agents
 * in the system. Provides a centralized way to manage agent configurations
 * and capabilities.
 *
 * @class AgentRegistry
 */
export class AgentRegistry {
  private registry: Map<string, AgentRegistryEntry> = new Map();
  private env: Env;

  /**
   * Creates a new AgentRegistry instance
   *
   * @param env - Cloudflare Workers environment configuration
   */
  constructor(env: Env) {
    this.env = env;
    this.initializeDefaultAgents();
  }

  /**
   * Registers a new agent in the registry
   *
   * @param entry - Agent registry entry
   * @returns Promise resolving when agent is registered
   */
  async registerAgent(entry: AgentRegistryEntry): Promise<void> {
    try {
      // Validate entry
      this.validateRegistryEntry(entry);

      // Check for conflicts
      if (this.registry.has(entry.config.id)) {
        throw new Error(
          `Agent with ID '${entry.config.id}' is already registered`
        );
      }

      // Register agent
      this.registry.set(entry.config.id, entry);

      // Store in database if needed
      await this.persistAgentRegistration(entry);
    } catch (error) {
      throw new Error(
        `Failed to register agent: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Gets an agent registry entry by ID
   *
   * @param agentId - Agent ID
   * @returns Agent registry entry or undefined
   */
  getAgent(agentId: string): AgentRegistryEntry | undefined {
    return this.registry.get(agentId);
  }

  /**
   * Gets all registered agents
   *
   * @returns Array of all agent registry entries
   */
  getAllAgents(): AgentRegistryEntry[] {
    return Array.from(this.registry.values());
  }

  /**
   * Gets agents by type
   *
   * @param type - Agent type
   * @returns Array of agents of specified type
   */
  getAgentsByType(type: AgentType): AgentRegistryEntry[] {
    return this.getAllAgents().filter((agent) => agent.config.type === type);
  }

  /**
   * Gets agents by capability
   *
   * @param capability - Required capability
   * @returns Array of agents with specified capability
   */
  getAgentsByCapability(capability: string): AgentRegistryEntry[] {
    return this.getAllAgents().filter((agent) =>
      agent.config.parameters.capabilities?.includes(capability)
    );
  }

  /**
   * Searches agents by query
   *
   * @param query - Search query
   * @returns Array of matching agents
   */
  searchAgents(query: string): AgentRegistryEntry[] {
    const lowercaseQuery = query.toLowerCase();

    return this.getAllAgents().filter(
      (agent) =>
        agent.config.name.toLowerCase().includes(lowercaseQuery) ||
        agent.config.description.toLowerCase().includes(lowercaseQuery) ||
        agent.metadata.tags.some((tag) =>
          tag.toLowerCase().includes(lowercaseQuery)
        )
    );
  }

  /**
   * Updates an agent registry entry
   *
   * @param agentId - Agent ID
   * @param updates - Partial updates to apply
   * @returns Promise resolving when agent is updated
   */
  async updateAgent(
    agentId: string,
    updates: Partial<AgentRegistryEntry>
  ): Promise<void> {
    const existing = this.registry.get(agentId);
    if (!existing) {
      throw new Error(`Agent with ID '${agentId}' not found`);
    }

    try {
      // Create updated entry
      const updated: AgentRegistryEntry = {
        ...existing,
        ...updates,
        updated_at: new Date().toISOString(),
      };

      // Validate updated entry
      this.validateRegistryEntry(updated);

      // Update registry
      this.registry.set(agentId, updated);

      // Persist changes
      await this.persistAgentRegistration(updated);
    } catch (error) {
      throw new Error(
        `Failed to update agent: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Unregisters an agent from the registry
   *
   * @param agentId - Agent ID
   * @returns Promise resolving when agent is unregistered
   */
  async unregisterAgent(agentId: string): Promise<void> {
    const existing = this.registry.get(agentId);
    if (!existing) {
      throw new Error(`Agent with ID '${agentId}' not found`);
    }

    try {
      // Remove from registry
      this.registry.delete(agentId);

      // Remove from database
      await this.removeAgentRegistration(agentId);
    } catch (error) {
      throw new Error(
        `Failed to unregister agent: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Gets agent statistics
   *
   * @returns Agent registry statistics
   */
  getStatistics() {
    const agents = this.getAllAgents();

    const byType = agents.reduce((acc, agent) => {
      acc[agent.config.type] = (acc[agent.config.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byStatus = agents.reduce((acc, agent) => {
      const status = agent.config.active ? "active" : "inactive";
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total_agents: agents.length,
      by_type: byType,
      by_status: byStatus,
      last_updated: new Date().toISOString(),
    };
  }

  /**
   * Initializes default agents in the registry
   */
  private initializeDefaultAgents(): void {
    const defaultAgents: AgentRegistryEntry[] = [
      {
        config: {
          id: "email-processor",
          name: "Email Processor Agent",
          description:
            "Processes and classifies incoming emails, extracts job links and OTP codes",
          type: AgentType.EMAIL_PROCESSOR,
          model: {
            id:
              this.env.DEFAULT_MODEL_REASONING ||
              "@cf/meta/llama-3.1-8b-instruct",
          },
          parameters: {
            capabilities: [
              "email_processing",
              "job_extraction",
              "otp_detection",
            ],
            max_emails_per_batch: 10,
            processing_timeout_ms: 30000,
          },
          active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        agent_class: "EmailProcessorAgent",
        dependencies: ["DB", "R2", "AI"],
        registered_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata: {
          version: "1.0.0",
          author: "9to5 Scout AI Team",
          description: "AI-powered email processing and classification",
          tags: ["email", "ai", "classification", "job-extraction"],
        },
      },
      {
        config: {
          id: "job-monitor",
          name: "Job Monitor Agent",
          description: "Monitors job postings for changes and updates",
          type: AgentType.JOB_MONITOR,
          model: {
            id:
              this.env.DEFAULT_MODEL_REASONING ||
              "@cf/meta/llama-3.1-8b-instruct",
          },
          parameters: {
            capabilities: [
              "job_monitoring",
              "change_detection",
              "status_updates",
            ],
            check_interval_minutes: 60,
            max_jobs_per_check: 100,
          },
          active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        agent_class: "JobMonitorAgent",
        dependencies: ["DB", "AI", "VECTORIZE_INDEX"],
        registered_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata: {
          version: "1.0.0",
          author: "9to5 Scout AI Team",
          description: "Intelligent job monitoring and change detection",
          tags: ["jobs", "monitoring", "ai", "change-detection"],
        },
      },
      {
        config: {
          id: "resume-optimization",
          name: "Resume Optimization Agent",
          description: "Optimizes resumes for specific job postings using AI",
          type: AgentType.RESUME_OPTIMIZATION,
          model: {
            id:
              this.env.DEFAULT_MODEL_REASONING ||
              "@cf/meta/llama-3.1-8b-instruct",
          },
          parameters: {
            capabilities: [
              "resume_optimization",
              "ats_analysis",
              "content_generation",
            ],
            max_resume_length: 2000,
            optimization_timeout_ms: 60000,
          },
          active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        agent_class: "ResumeOptimizationAgent",
        dependencies: ["DB", "AI", "R2"],
        registered_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata: {
          version: "1.0.0",
          author: "9to5 Scout AI Team",
          description: "AI-powered resume optimization and ATS analysis",
          tags: ["resume", "optimization", "ai", "ats"],
        },
      },
      {
        config: {
          id: "company-intelligence",
          name: "Company Intelligence Agent",
          description:
            "Analyzes companies and extracts intelligence about culture, benefits, and opportunities",
          type: AgentType.COMPANY_INTELLIGENCE,
          model: {
            id:
              this.env.DEFAULT_MODEL_REASONING ||
              "@cf/meta/llama-3.1-8b-instruct",
          },
          parameters: {
            capabilities: [
              "company_analysis",
              "benefits_extraction",
              "culture_analysis",
            ],
            analysis_depth: "comprehensive",
            data_sources: ["web", "job_postings", "reviews"],
          },
          active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        agent_class: "CompanyIntelligenceAgent",
        dependencies: ["DB", "AI", "MYBROWSER"],
        registered_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata: {
          version: "1.0.0",
          author: "9to5 Scout AI Team",
          description: "Comprehensive company intelligence and analysis",
          tags: ["company", "intelligence", "analysis", "benefits"],
        },
      },
      {
        config: {
          id: "interview-preparation",
          name: "Interview Preparation Agent",
          description:
            "Prepares interview questions and provides coaching based on job requirements",
          type: AgentType.INTERVIEW_PREPARATION,
          model: {
            id:
              this.env.DEFAULT_MODEL_REASONING ||
              "@cf/meta/llama-3.1-8b-instruct",
          },
          parameters: {
            capabilities: [
              "question_generation",
              "interview_coaching",
              "feedback_analysis",
            ],
            question_categories: ["technical", "behavioral", "situational"],
            coaching_style: "supportive",
          },
          active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        agent_class: "InterviewPreparationAgent",
        dependencies: ["DB", "AI"],
        registered_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata: {
          version: "1.0.0",
          author: "9to5 Scout AI Team",
          description: "AI-powered interview preparation and coaching",
          tags: ["interview", "preparation", "coaching", "ai"],
        },
      },
    ];

    // Register default agents
    defaultAgents.forEach((agent) => {
      this.registry.set(agent.config.id, agent);
    });
  }

  /**
   * Validates a registry entry
   *
   * @param entry - Registry entry to validate
   * @throws Error if entry is invalid
   */
  private validateRegistryEntry(entry: AgentRegistryEntry): void {
    if (!entry.config || !entry.agent_class) {
      throw new Error("Registry entry must include config and agent_class");
    }

    if (!entry.config.id || !entry.config.name || !entry.config.type) {
      throw new Error("Agent config must include id, name, and type");
    }

    if (!entry.metadata || !entry.metadata.version) {
      throw new Error("Registry entry must include metadata with version");
    }
  }

  /**
   * Persists agent registration to database
   *
   * @param entry - Agent registry entry to persist
   */
  private async persistAgentRegistration(
    entry: AgentRegistryEntry
  ): Promise<void> {
    // This would store the agent configuration in D1 database
    // For now, we'll just log the action
    console.log(`Persisting agent registration: ${entry.config.id}`);
  }

  /**
   * Removes agent registration from database
   *
   * @param agentId - Agent ID to remove
   */
  private async removeAgentRegistration(agentId: string): Promise<void> {
    // This would remove the agent configuration from D1 database
    // For now, we'll just log the action
    console.log(`Removing agent registration: ${agentId}`);
  }
}
