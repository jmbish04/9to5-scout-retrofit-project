/**
 * Agent configuration management routes
 */

import type { Env } from "../index";

export interface AgentConfig {
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

export async function handleAgentsGet(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const enabled = url.searchParams.get("enabled");

    let sql = "SELECT * FROM agent_configs";
    const params: unknown[] = [];

    if (enabled !== null) {
      sql += " WHERE enabled = ?";
      params.push(enabled === "true" ? 1 : 0);
    }

    sql += " ORDER BY created_at DESC";

    const { results } = await env.DB.prepare(sql)
      .bind(...params)
      .all();

    // Convert database results to proper types
    const agents = results.map((row: Record<string, unknown>) => ({
      ...row,
      enabled: Boolean(row.enabled),
      max_tokens: row.max_tokens || 4000,
      temperature: row.temperature || 0.7,
    }));

    return new Response(JSON.stringify(agents), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error listing agents:", error);
    return new Response(JSON.stringify({ error: "Failed to list agents" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function handleAgentsPost(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const agent: AgentConfig = await request.json();

    // Validate required fields
    if (
      !agent.id ||
      !agent.name ||
      !agent.role ||
      !agent.goal ||
      !agent.backstory ||
      !agent.llm
    ) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const now = new Date().toISOString();

    await env.DB.prepare(
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

    return new Response(JSON.stringify(createdAgent), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error creating agent:", error);
    return new Response(JSON.stringify({ error: "Failed to create agent" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function handleAgentGet(
  request: Request,
  env: Env,
  agentId: string
): Promise<Response> {
  try {
    const { results } = await env.DB.prepare(
      "SELECT * FROM agent_configs WHERE id = ?"
    )
      .bind(agentId)
      .all();

    if (results.length === 0) {
      return new Response(JSON.stringify({ error: "Agent not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const agent = results[0];
    if (!agent) {
      return new Response(JSON.stringify({ error: "Agent not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const formattedAgent = {
      ...agent,
      enabled: Boolean(agent.enabled),
      max_tokens: agent.max_tokens || 4000,
      temperature: agent.temperature || 0.7,
    };

    return new Response(JSON.stringify(formattedAgent), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error getting agent:", error);
    return new Response(JSON.stringify({ error: "Failed to get agent" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function handleAgentPut(
  request: Request,
  env: Env,
  agentId: string
): Promise<Response> {
  try {
    const agent: Partial<AgentConfig> = await request.json();
    const now = new Date().toISOString();

    // Check if agent exists
    const { results } = await env.DB.prepare(
      "SELECT id FROM agent_configs WHERE id = ?"
    )
      .bind(agentId)
      .all();

    if (results.length === 0) {
      return new Response(JSON.stringify({ error: "Agent not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    await env.DB.prepare(
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
        agentId
      )
      .run();

    // Fetch updated agent
    const { results: updatedResults } = await env.DB.prepare(
      "SELECT * FROM agent_configs WHERE id = ?"
    )
      .bind(agentId)
      .all();

    const updatedAgent = updatedResults[0];
    if (!updatedAgent) {
      return new Response(JSON.stringify({ error: "Agent not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const formattedAgent = {
      ...updatedAgent,
      enabled: Boolean(updatedAgent.enabled),
      max_tokens: updatedAgent.max_tokens || 4000,
      temperature: updatedAgent.temperature || 0.7,
    };

    return new Response(JSON.stringify(formattedAgent), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error updating agent:", error);
    return new Response(JSON.stringify({ error: "Failed to update agent" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function handleAgentDelete(
  request: Request,
  env: Env,
  agentId: string
): Promise<Response> {
  try {
    // Check if agent exists
    const { results } = await env.DB.prepare(
      "SELECT id FROM agent_configs WHERE id = ?"
    )
      .bind(agentId)
      .all();

    if (!results || results.length === 0) {
      return new Response(JSON.stringify({ error: "Agent not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Check if agent is referenced by any tasks
    const { results: taskResults } = await env.DB.prepare(
      "SELECT COUNT(*) as count FROM task_configs WHERE agent_id = ?"
    )
      .bind(agentId)
      .all();

    const taskCountResult = taskResults[0] as { count: number };
    if (taskCountResult.count > 0) {
      return new Response(
        JSON.stringify({
          error: "Cannot delete agent: it is referenced by existing tasks",
        }),
        {
          status: 409,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    await env.DB.prepare("DELETE FROM agent_configs WHERE id = ?")
      .bind(agentId)
      .run();

    return new Response("", { status: 204 });
  } catch (error) {
    console.error("Error deleting agent:", error);
    return new Response(JSON.stringify({ error: "Failed to delete agent" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
