/**
 * @module src/mcp.ts
 * @description
 * Model Context Protocol (MCP) endpoints.
 * Mirrors RPC registry but exposes tools for MCP clients.
 */

import { rpcRegistry } from "./rpc";
import type {
  MCPExecuteRequest,
  MCPExecuteResponse,
  MCPTool,
} from "./schemas/apiSchemas";
import type { Env } from "./types";

/**
 * List available MCP tools derived from RPC registry
 */
export function listMCPTools(): MCPTool[] {
  const methods = rpcRegistry.list();

  return methods.map((method) => ({
    name: method.name,
    description: method.description,
    inputSchema: method.paramsSchema
      ? (method.paramsSchema as any).shape || {}
      : {},
  }));
}

/**
 * Execute MCP tool
 */
export async function executeMCPTool(
  request: MCPExecuteRequest,
  env: Env
): Promise<MCPExecuteResponse> {
  try {
    const result = await rpcRegistry.execute(request.tool, request.params, env);

    return {
      result,
    };
  } catch (error) {
    return {
      result: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
