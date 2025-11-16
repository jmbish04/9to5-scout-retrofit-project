/**
 * @module src/rpc.ts
 * @description
 * RPC registry and dispatcher. Shared handlers for REST/WS/MCP.
 */

import { z } from "zod";
import type { RPCRequest, RPCResponse } from "./schemas/apiSchemas";
import type { Env } from "./types";

export type RPCHandler = (
  params: Record<string, unknown>,
  env: Env
) => Promise<unknown>;

export interface RPCMethod {
  name: string;
  description: string;
  paramsSchema?: z.ZodSchema;
  handler: RPCHandler;
}

/**
 * RPC Registry - central registry for all RPC methods
 */
class RPCRegistry {
  private methods: Map<string, RPCMethod> = new Map();

  register(method: RPCMethod): void {
    this.methods.set(method.name, method);
  }

  get(name: string): RPCMethod | undefined {
    return this.methods.get(name);
  }

  list(): RPCMethod[] {
    return Array.from(this.methods.values());
  }

  async execute(
    name: string,
    params: Record<string, unknown>,
    env: Env
  ): Promise<unknown> {
    const method = this.methods.get(name);
    if (!method) {
      throw new Error(`Unknown RPC method: ${name}`);
    }

    // Validate params if schema provided
    if (method.paramsSchema) {
      const validated = method.paramsSchema.parse(params) as Record<
        string,
        unknown
      >;
      return method.handler(validated, env);
    }

    return method.handler(params, env);
  }
}

// Global registry instance
export const rpcRegistry = new RPCRegistry();

// Register example methods
rpcRegistry.register({
  name: "analyze",
  description: "Analyze text using AI",
  paramsSchema: z.object({
    text: z.string().min(1),
  }),
  handler: async (params, env) => {
    const { text } = params as { text: string };
    const model =
      env.DEFAULT_MODEL_REASONING || "@cf/meta/llama-3.1-8b-instruct";

    const response = await env.AI.run(model as keyof AiModels, {
      messages: [
        {
          role: "user",
          content: `Analyze this text and provide insights: ${text}`,
        },
      ],
    });

    return {
      analysis: (response as any).response,
      model,
    };
  },
});

rpcRegistry.register({
  name: "health",
  description: "Get system health status",
  handler: async (params, env) => {
    // This would call the health endpoint logic
    return {
      status: "healthy",
      timestamp: new Date().toISOString(),
    };
  },
});

/**
 * Handle RPC request
 */
export async function handleRPC(
  request: RPCRequest,
  env: Env
): Promise<RPCResponse> {
  try {
    const result = await rpcRegistry.execute(
      request.method,
      request.params || {},
      env
    );
    return {
      result,
      id: request.id,
    };
  } catch (error) {
    return {
      error: {
        error: error instanceof Error ? error.message : "Unknown error",
        code: "RPC_ERROR",
      },
      id: request.id,
    };
  }
}
