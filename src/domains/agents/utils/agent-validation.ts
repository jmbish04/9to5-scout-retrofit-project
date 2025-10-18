/**
 * @fileoverview Agent Validation Utility
 *
 * Comprehensive validation utilities for agent configurations, requests,
 * and responses to ensure data integrity and type safety.
 *
 * @author 9to5 Scout AI Team
 * @version 1.0.0
 * @since 2024-01-01
 */

import { z } from "zod";
import type {
  AgentCapabilities,
  AgentConfig,
  AgentRequest,
  AgentResponse,
} from "../types/agent.types";
import { AgentType } from "../types/agent.types";

/**
 * Agent configuration validation schema
 */
export const AgentConfigSchema = z.object({
  id: z.string().min(1, "Agent ID is required"),
  name: z.string().min(1, "Agent name is required"),
  description: z.string().min(1, "Agent description is required"),
  type: z.nativeEnum(AgentType),
  model: z.object({
    id: z.string().min(1, "Model ID is required"),
    parameters: z.record(z.string(), z.any()).optional(),
  }),
  parameters: z.record(z.string(), z.any()),
  active: z.boolean(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

/**
 * Agent request validation schema
 */
export const AgentRequestSchema = z.object({
  request_id: z.string().min(1, "Request ID is required"),
  agent_id: z.string().min(1, "Agent ID is required"),
  operation: z.string().min(1, "Operation is required"),
  payload: z.any(),
  metadata: z.object({
    user_id: z.string().optional(),
    session_id: z.string().optional(),
    timestamp: z.string().datetime(),
    priority: z.enum(["low", "normal", "high", "urgent"]),
    timeout_ms: z.number().positive().optional(),
  }),
});

/**
 * Agent response validation schema
 */
export const AgentResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z
    .object({
      code: z.string(),
      message: z.string(),
      details: z.string().optional(),
      stack: z.string().optional(),
      context: z.record(z.string(), z.any()).optional(),
    })
    .optional(),
  metadata: z.object({
    agent_id: z.string(),
    agent_name: z.string(),
    timestamp: z.string().datetime(),
    processing_time_ms: z.number().nonnegative(),
    model_used: z.string(),
  }),
});

/**
 * Agent capabilities validation schema
 */
export const AgentCapabilitiesSchema = z.object({
  input_formats: z.array(z.string()),
  output_formats: z.array(z.string()),
  max_concurrent: z.number().positive(),
  operations: z.array(z.string()),
  permissions: z.array(z.string()),
  resources: z.object({
    memory_mb: z.number().positive(),
    cpu_cores: z.number().positive(),
    storage_mb: z.number().positive(),
  }),
});

/**
 * Validates agent configuration
 *
 * @param config - Agent configuration to validate
 * @returns Validation result
 */
export function validateAgentConfig(config: unknown): {
  success: boolean;
  data?: AgentConfig;
  error?: string;
} {
  try {
    const validatedConfig = AgentConfigSchema.parse(config);
    return {
      success: true,
      data: validatedConfig,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: `Validation failed: ${error.issues
          .map((e: any) => `${e.path.join(".")}: ${e.message}`)
          .join(", ")}`,
      };
    }
    return {
      success: false,
      error: `Validation failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    };
  }
}

/**
 * Validates agent request
 *
 * @param request - Agent request to validate
 * @returns Validation result
 */
export function validateAgentRequest(request: unknown): {
  success: boolean;
  data?: AgentRequest;
  error?: string;
} {
  try {
    const validatedRequest = AgentRequestSchema.parse(request);
    return {
      success: true,
      data: validatedRequest,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: `Validation failed: ${error.issues
          .map((e: any) => `${e.path.join(".")}: ${e.message}`)
          .join(", ")}`,
      };
    }
    return {
      success: false,
      error: `Validation failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    };
  }
}

/**
 * Validates agent response
 *
 * @param response - Agent response to validate
 * @returns Validation result
 */
export function validateAgentResponse(response: unknown): {
  success: boolean;
  data?: AgentResponse;
  error?: string;
} {
  try {
    const validatedResponse = AgentResponseSchema.parse(response);
    return {
      success: true,
      data: validatedResponse,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: `Validation failed: ${error.issues
          .map((e: any) => `${e.path.join(".")}: ${e.message}`)
          .join(", ")}`,
      };
    }
    return {
      success: false,
      error: `Validation failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    };
  }
}

/**
 * Validates agent capabilities
 *
 * @param capabilities - Agent capabilities to validate
 * @returns Validation result
 */
export function validateAgentCapabilities(capabilities: unknown): {
  success: boolean;
  data?: AgentCapabilities;
  error?: string;
} {
  try {
    const validatedCapabilities = AgentCapabilitiesSchema.parse(capabilities);
    return {
      success: true,
      data: validatedCapabilities,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: `Validation failed: ${error.issues
          .map((e: any) => `${e.path.join(".")}: ${e.message}`)
          .join(", ")}`,
      };
    }
    return {
      success: false,
      error: `Validation failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    };
  }
}

/**
 * Validates agent type
 *
 * @param type - Agent type to validate
 * @returns True if valid agent type
 */
export function isValidAgentType(type: string): type is AgentType {
  return Object.values(AgentType).includes(type as AgentType);
}

/**
 * Validates agent ID format
 *
 * @param id - Agent ID to validate
 * @returns True if valid agent ID format
 */
export function isValidAgentId(id: string): boolean {
  // Agent IDs should be lowercase, alphanumeric with hyphens
  const agentIdPattern = /^[a-z0-9-]+$/;
  return agentIdPattern.test(id) && id.length >= 1 && id.length <= 50;
}

/**
 * Validates agent name format
 *
 * @param name - Agent name to validate
 * @returns True if valid agent name format
 */
export function isValidAgentName(name: string): boolean {
  // Agent names should be human-readable
  return name.length >= 1 && name.length <= 100;
}

/**
 * Validates model ID format
 *
 * @param modelId - Model ID to validate
 * @returns True if valid model ID format
 */
export function isValidModelId(modelId: string): boolean {
  // Model IDs should follow Cloudflare Workers AI format
  const modelIdPattern = /^@cf\/[a-z0-9-]+\/[a-z0-9-]+$/;
  return modelIdPattern.test(modelId);
}

/**
 * Validates agent parameters
 *
 * @param parameters - Agent parameters to validate
 * @param requiredParams - Required parameter names
 * @returns Validation result
 */
export function validateAgentParameters(
  parameters: Record<string, any>,
  requiredParams: string[] = []
): {
  success: boolean;
  error?: string;
} {
  try {
    // Check for required parameters
    for (const param of requiredParams) {
      if (!(param in parameters)) {
        return {
          success: false,
          error: `Required parameter '${param}' is missing`,
        };
      }
    }

    // Validate parameter types and values
    for (const [key, value] of Object.entries(parameters)) {
      if (value === null || value === undefined) {
        return {
          success: false,
          error: `Parameter '${key}' cannot be null or undefined`,
        };
      }
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `Parameter validation failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    };
  }
}

/**
 * Sanitizes agent configuration
 *
 * @param config - Agent configuration to sanitize
 * @returns Sanitized configuration
 */
export function sanitizeAgentConfig(
  config: Partial<AgentConfig>
): Partial<AgentConfig> {
  const sanitized = { ...config };

  // Sanitize string fields
  if (sanitized.id) {
    sanitized.id = sanitized.id.toLowerCase().trim();
  }
  if (sanitized.name) {
    sanitized.name = sanitized.name.trim();
  }
  if (sanitized.description) {
    sanitized.description = sanitized.description.trim();
  }

  // Sanitize model ID
  if (sanitized.model?.id) {
    sanitized.model.id = sanitized.model.id.toLowerCase().trim();
  }

  // Sanitize parameters
  if (sanitized.parameters) {
    const sanitizedParams: Record<string, any> = {};
    for (const [key, value] of Object.entries(sanitized.parameters)) {
      const sanitizedKey = key.toLowerCase().trim();
      sanitizedParams[sanitizedKey] = value;
    }
    sanitized.parameters = sanitizedParams;
  }

  return sanitized;
}

/**
 * Validates agent configuration completeness
 *
 * @param config - Agent configuration to validate
 * @returns Validation result with missing fields
 */
export function validateAgentConfigCompleteness(config: Partial<AgentConfig>): {
  isComplete: boolean;
  missingFields: string[];
} {
  const requiredFields: (keyof AgentConfig)[] = [
    "id",
    "name",
    "description",
    "type",
    "model",
    "parameters",
    "active",
  ];

  const missingFields: string[] = [];

  for (const field of requiredFields) {
    if (
      !(field in config) ||
      config[field] === undefined ||
      config[field] === null
    ) {
      missingFields.push(field);
    }
  }

  // Check nested required fields
  if (config.model && !config.model.id) {
    missingFields.push("model.id");
  }

  return {
    isComplete: missingFields.length === 0,
    missingFields,
  };
}
