/**
 * @fileoverview Agent Management Routes
 *
 * RESTful API routes for managing AI agent configurations, instances,
 * and operations. Provides comprehensive agent lifecycle management.
 *
 * @author 9to5 Scout AI Team
 * @version 1.0.0
 * @since 2024-01-01
 */

import { Hono } from "hono";
import { z } from "zod";
import type { Env } from "../../../config/env";
import {
  getValidatedBody,
  getValidatedParams,
  logger,
  rateLimit,
  validateBody,
  validateParams,
} from "../../../core/validation/hono-validation";
// Removed problematic imports - using direct database queries for now

const app = new Hono<{ Bindings: Env }>();

// Middleware
app.use("*", logger as any);
app.use("*", rateLimit({ requests: 100, windowMs: 60000 }) as any);

// Legacy AgentConfig interface for backward compatibility
export interface LegacyAgentConfig {
  id: string;
  name: string;
  role: string;
  goal: string;
  backstory: string;
  llm: string;
  system_prompt?: string;
  max_tokens?: number;
  temperature?: number;
  enabled?: boolean;
  created_at?: string;
  updated_at?: string;
}

// Schemas
const LegacyAgentConfigSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  role: z.string().min(1),
  goal: z.string().min(1),
  backstory: z.string().min(1),
  llm: z.string().min(1),
  system_prompt: z.string().optional(),
  max_tokens: z.number().optional(),
  temperature: z.number().optional(),
  enabled: z.boolean().optional(),
});

// Routes

/**
 * GET /agents - List all agents
 */
app.get("/", async (c) => {
  try {
    const url = new URL(c.req.url);
    const enabled = url.searchParams.get("enabled");

    let sql = "SELECT * FROM agent_configs";
    const params: unknown[] = [];

    if (enabled !== null) {
      sql += " WHERE enabled = ?";
      params.push(enabled === "true" ? 1 : 0);
    }

    sql += " ORDER BY created_at DESC";

    const { results } = await c.env.DB.prepare(sql)
      .bind(...params)
      .all();

    // Convert database results to proper types
    const agents = results.map((row: Record<string, unknown>) => ({
      ...row,
      enabled: Boolean(row.enabled),
      max_tokens: row.max_tokens || 4000,
      temperature: row.temperature || 0.7,
    }));

    return c.json(agents);
  } catch (error) {
    console.error("Error listing agents:", error);
    return c.json({ error: "Failed to list agents" }, 500);
  }
});

/**
 * POST /agents - Create a new agent
 */
app.post("/", validateBody(LegacyAgentConfigSchema), async (c) => {
  try {
    const agent = getValidatedBody(c);

    // Validate required fields
    if (
      !agent.id ||
      !agent.name ||
      !agent.role ||
      !agent.goal ||
      !agent.backstory ||
      !agent.llm
    ) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    const now = new Date().toISOString();

    await c.env.DB.prepare(
      `
        INSERT INTO agent_configs (
          id, name, role, goal, backstory, llm, system_prompt, 
          max_tokens, temperature, enabled, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    )
      .bind(
        agent.id,
        agent.name,
        agent.role,
        agent.goal,
        agent.backstory,
        agent.llm,
        agent.system_prompt || null,
        agent.max_tokens || 4000,
        agent.temperature || 0.7,
        agent.enabled !== false ? 1 : 0,
        now,
        now
      )
      .run();

    const createdAgent = {
      ...agent,
      max_tokens: agent.max_tokens || 4000,
      temperature: agent.temperature || 0.7,
      enabled: agent.enabled !== false,
      created_at: now,
      updated_at: now,
    };

    return c.json(createdAgent, 201);
  } catch (error) {
    console.error("Error creating agent:", error);
    return c.json({ error: "Failed to create agent" }, 500);
  }
});

/**
 * GET /agents/:id - Get a specific agent
 */
app.get(
  "/:id",
  validateParams(z.object({ id: z.string().min(1) })),
  async (c) => {
    try {
      const { id } = getValidatedParams(c) as { id: string };

      const { results } = await c.env.DB.prepare(
        "SELECT * FROM agent_configs WHERE id = ?"
      )
        .bind(id)
        .all();

      if (results.length === 0) {
        return c.json({ error: "Agent not found" }, 404);
      }

      const agent = results[0];
      if (!agent) {
        return c.json({ error: "Agent not found" }, 404);
      }

      const formattedAgent = {
        ...agent,
        enabled: Boolean(agent.enabled),
        max_tokens: agent.max_tokens || 4000,
        temperature: agent.temperature || 0.7,
      };

      return c.json(formattedAgent);
    } catch (error) {
      console.error("Error getting agent:", error);
      return c.json({ error: "Failed to get agent" }, 500);
    }
  }
);

/**
 * PUT /agents/:id - Update a specific agent
 */
app.put(
  "/:id",
  validateParams(z.object({ id: z.string().min(1) })),
  validateBody(LegacyAgentConfigSchema.partial()),
  async (c) => {
    try {
      const { id } = getValidatedParams(c) as { id: string };
      const agent = getValidatedBody(c);
      const now = new Date().toISOString();

      // Check if agent exists
      const { results } = await c.env.DB.prepare(
        "SELECT id FROM agent_configs WHERE id = ?"
      )
        .bind(id)
        .all();

      if (results.length === 0) {
        return c.json({ error: "Agent not found" }, 404);
      }

      await c.env.DB.prepare(
        `
        UPDATE agent_configs SET 
          name = COALESCE(?, name),
          role = COALESCE(?, role),
          goal = COALESCE(?, goal),
          backstory = COALESCE(?, backstory),
          llm = COALESCE(?, llm),
          system_prompt = COALESCE(?, system_prompt),
          max_tokens = COALESCE(?, max_tokens),
          temperature = COALESCE(?, temperature),
          enabled = COALESCE(?, enabled),
          updated_at = ?
        WHERE id = ?
      `
      )
        .bind(
          agent.name || null,
          agent.role || null,
          agent.goal || null,
          agent.backstory || null,
          agent.llm || null,
          agent.system_prompt || null,
          agent.max_tokens || null,
          agent.temperature || null,
          agent.enabled !== undefined ? (agent.enabled ? 1 : 0) : null,
          now,
          id
        )
        .run();

      // Fetch updated agent
      const { results: updatedResults } = await c.env.DB.prepare(
        "SELECT * FROM agent_configs WHERE id = ?"
      )
        .bind(id)
        .all();

      const updatedAgent = updatedResults[0];
      if (!updatedAgent) {
        return c.json({ error: "Agent not found" }, 404);
      }

      const formattedAgent = {
        ...updatedAgent,
        enabled: Boolean(updatedAgent.enabled),
        max_tokens: updatedAgent.max_tokens || 4000,
        temperature: updatedAgent.temperature || 0.7,
      };

      return c.json(formattedAgent);
    } catch (error) {
      console.error("Error updating agent:", error);
      return c.json({ error: "Failed to update agent" }, 500);
    }
  }
);

/**
 * DELETE /agents/:id - Delete a specific agent
 */
app.delete(
  "/:id",
  validateParams(z.object({ id: z.string().min(1) })),
  async (c) => {
    try {
      const { id } = getValidatedParams(c) as { id: string };

      // Check if agent exists
      const { results } = await c.env.DB.prepare(
        "SELECT id FROM agent_configs WHERE id = ?"
      )
        .bind(id)
        .all();

      if (!results || results.length === 0) {
        return c.json({ error: "Agent not found" }, 404);
      }

      // Check if agent is referenced by any tasks
      const { results: taskResults } = await c.env.DB.prepare(
        "SELECT COUNT(*) as count FROM task_configs WHERE agent_id = ?"
      )
        .bind(id)
        .all();

      const taskCountResult = taskResults[0] as { count: number };
      if (taskCountResult.count > 0) {
        return c.json(
          {
            error: "Cannot delete agent: it is referenced by existing tasks",
          },
          409
        );
      }

      await c.env.DB.prepare("DELETE FROM agent_configs WHERE id = ?")
        .bind(id)
        .run();

      return c.body(null, 204);
    } catch (error) {
      console.error("Error deleting agent:", error);
      return c.json({ error: "Failed to delete agent" }, 500);
    }
  }
);

/**
 * GET /agents/instances - List all agent instances
 */
app.get("/instances", async (c) => {
  try {
    // For now, return empty list since we don't have agent instances
    return c.json({
      instances: [],
      total: 0,
    });
  } catch (error) {
    console.error("Error listing agent instances:", error);
    return c.json({ error: "Failed to list agent instances" }, 500);
  }
});

/**
 * GET /agents/instances/:id - Get a specific agent instance
 */
app.get(
  "/instances/:id",
  validateParams(z.object({ id: z.string().min(1) })),
  async (c) => {
    try {
      const { id } = getValidatedParams(c) as { id: string };

      // For now, return not found since we don't have agent instances
      return c.json({ error: "Agent instance not found" }, 404);
    } catch (error) {
      console.error("Error getting agent instance:", error);
      return c.json({ error: "Failed to get agent instance" }, 500);
    }
  }
);

/**
 * GET /agents/health - Get health status of all agents
 */
app.get("/health", async (c) => {
  try {
    // For now, return basic health status
    return c.json({
      system_health: "healthy",
      agent_health: [],
    });
  } catch (error) {
    console.error("Error getting agent health:", error);
    return c.json({ error: "Failed to get agent health" }, 500);
  }
});

/**
 * GET /agents/registry - Get agent registry
 */
app.get("/registry", async (c) => {
  try {
    // Get agents from database
    const { results } = await c.env.DB.prepare(
      "SELECT id, name, role, enabled FROM agent_configs ORDER BY created_at DESC"
    ).all();

    const agents = results.map((agent: any) => ({
      id: agent.id,
      name: agent.name,
      role: agent.role,
      enabled: Boolean(agent.enabled),
    }));

    return c.json({
      agents,
      statistics: {
        total_agents: agents.length,
        enabled_agents: agents.filter((a: any) => a.enabled).length,
      },
    });
  } catch (error) {
    console.error("Error getting agent registry:", error);
    return c.json({ error: "Failed to get agent registry" }, 500);
  }
});

export { app as agentsRoutes };
