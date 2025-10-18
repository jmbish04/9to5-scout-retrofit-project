/**
 * @fileoverview Agents Domain - Centralized AI Agent Management
 *
 * This module provides a comprehensive suite of AI agents for the 9to5 Scout platform,
 * each specialized for specific business functions. All agents are built using the
 * Cloudflare Agents SDK and are designed to be stateful, autonomous, and capable of
 * long-running operations.
 *
 * @author 9to5 Scout AI Team
 * @version 1.0.0
 * @since 2024-01-01
 */

// Agent Classes
export { CareerCoachAgent } from "./career-coach-agent";
export { CompanyIntelligenceAgent } from "./company-intelligence-agent";
export { EmailProcessorAgent } from "./email-processor-agent";
export { GenericAgent } from "./generic_agent";
export { InterviewPreparationAgent } from "./interview-preparation-agent";
export { JobMonitorAgent } from "./job-monitor-agent";
export { RAGAgent } from "./rag_agent";
export { ResumeOptimizationAgent } from "./resume-optimization-agent";

// Agent Routes
export { agentRoutes } from "./routes/agent";
export { agentsRoutes } from "./routes/agents";

// Agent Types and Interfaces
export type {
  AgentCapabilities,
  AgentConfig,
  AgentError,
  AgentResponse,
  AgentStatus,
} from "./types/agent.types";

// Agent Services
export { AgentHealthMonitor } from "./services/agent-health-monitor.service";
export { AgentManager } from "./services/agent-manager.service";
export { AgentRegistry } from "./services/agent-registry.service";

// Agent Utilities
export { createAgentInstance } from "./utils/agent-factory";
export { formatAgentResponse } from "./utils/agent-formatters";
export { validateAgentConfig } from "./utils/agent-validation";
