/**
 * @module src/utils/openapi.ts
 * @description
 * OpenAPI 3.1.0 runtime generator.
 * Manually builds OpenAPI spec from Zod schemas (compatible with Zod v4).
 */

import { z } from "zod";
import * as schemas from "../schemas/apiSchemas";

/**
 * Convert Zod schema to OpenAPI schema object
 */
function zodToOpenAPISchema(schema: any): any {
  if (schema instanceof z.ZodString) {
    return { type: "string" };
  }
  if (schema instanceof z.ZodNumber) {
    return { type: "number" };
  }
  if (schema instanceof z.ZodBoolean) {
    return { type: "boolean" };
  }
  if (schema instanceof z.ZodArray) {
    return {
      type: "array",
      items: zodToOpenAPISchema(schema.element),
    };
  }
  if (schema instanceof z.ZodObject) {
    const shape = schema.shape;
    const properties: Record<string, any> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      properties[key] = zodToOpenAPISchema(value);
      // Check if field is optional
      if (!(value instanceof z.ZodOptional || value instanceof z.ZodNullable)) {
        required.push(key);
      }
    }

    return {
      type: "object",
      properties,
      ...(required.length > 0 && { required }),
    };
  }
  if (schema instanceof z.ZodEnum) {
    return {
      type: "string",
      enum: schema.options,
    };
  }
  if (schema instanceof z.ZodOptional) {
    return zodToOpenAPISchema(schema.unwrap());
  }
  if (schema instanceof z.ZodNullable) {
    return zodToOpenAPISchema(schema.unwrap());
  }
  if (schema instanceof z.ZodDefault) {
    return zodToOpenAPISchema(schema.removeDefault());
  }

  // Fallback
  return { type: "object" };
}

/**
 * Generate OpenAPI 3.1.0 JSON document
 */
export function generateOpenAPIJSON(
  baseUrl: string = "https://9to5-scout.hacolby.workers.dev"
): string {
  const document = {
    openapi: "3.1.0",
    jsonSchemaDialect: "https://spec.openapis.org/oas/3.1/dialect/base",
    info: {
      title: "9to5 Scout API",
      version: "1.0.0",
      description:
        "AI-powered job application assistant API with health monitoring and self-healing capabilities",
      contact: {
        name: "9to5 Scout",
        url: "https://github.com/jmbish04/9to5-scout-retrofit-project",
      },
    },
    servers: [
      {
        url: baseUrl,
        description: "Production",
      },
    ],
    tags: [
      { name: "Health", description: "Health monitoring endpoints" },
      { name: "Tests", description: "Test execution and results" },
      { name: "RPC", description: "Remote procedure calls" },
      { name: "MCP", description: "Model Context Protocol" },
    ],
    paths: {
      "/api/health": {
        get: {
          operationId: "getHealth",
          summary: "Get health snapshot",
          description:
            "Returns a summary of system health including latest test session status",
          tags: ["Health"],
          responses: {
            "200": {
              description: "Health snapshot",
              content: {
                "application/json": {
                  schema: zodToOpenAPISchema(schemas.HealthSnapshotSchema),
                  example: {
                    status: "healthy",
                    uptime: 3600,
                    lastTestSession: {
                      sessionUuid: "123e4567-e89b-12d3-a456-426614174000",
                      finishedAt: "2025-01-17T12:00:00Z",
                      passed: 5,
                      failed: 0,
                      totalTests: 5,
                    },
                    timestamp: "2025-01-17T12:00:00Z",
                  },
                },
              },
            },
          },
        },
      },
      "/api/tests/run": {
        post: {
          operationId: "runTests",
          summary: "Run health tests",
          description: "Triggers a new test session and returns session UUID",
          tags: ["Tests"],
          requestBody: {
            content: {
              "application/json": {
                schema: zodToOpenAPISchema(schemas.TestRunRequestSchema),
                example: {
                  testIds: [],
                  includeInactive: false,
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Test session started",
              content: {
                "application/json": {
                  schema: zodToOpenAPISchema(schemas.TestRunResponseSchema),
                  example: {
                    sessionUuid: "123e4567-e89b-12d3-a456-426614174000",
                    status: "running",
                    totalTests: 5,
                    startedAt: "2025-01-17T12:00:00Z",
                  },
                },
              },
            },
            "400": {
              description: "Invalid request",
              content: {
                "application/json": {
                  schema: zodToOpenAPISchema(schemas.ErrorSchema),
                },
              },
            },
          },
        },
      },
      "/api/tests/defs": {
        get: {
          operationId: "getTestDefinitions",
          summary: "List test definitions",
          description: "Returns all active test definitions",
          tags: ["Tests"],
          responses: {
            "200": {
              description: "List of test definitions",
              content: {
                "application/json": {
                  schema: {
                    type: "array",
                    items: zodToOpenAPISchema(schemas.TestDefSchema),
                  },
                  example: [
                    {
                      id: "123e4567-e89b-12d3-a456-426614174000",
                      name: "Health Check",
                      description: "Checks if the service is responding",
                      category: "connectivity",
                      severity: "critical",
                      isActive: true,
                      createdAt: "2025-01-17T12:00:00Z",
                    },
                  ],
                },
              },
            },
          },
        },
      },
      "/api/tests/session/{sessionUuid}": {
        get: {
          operationId: "getSessionResults",
          summary: "Get test session results",
          description: "Returns detailed results for a specific test session",
          tags: ["Tests"],
          parameters: [
            {
              name: "sessionUuid",
              in: "path",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          responses: {
            "200": {
              description: "Session results",
              content: {
                "application/json": {
                  schema: zodToOpenAPISchema(schemas.SessionResultsSchema),
                },
              },
            },
            "404": {
              description: "Session not found",
              content: {
                "application/json": {
                  schema: zodToOpenAPISchema(schemas.ErrorSchema),
                },
              },
            },
          },
        },
      },
      "/api/tests/latest": {
        get: {
          operationId: "getLatestSession",
          summary: "Get latest test session",
          description: "Returns the most recent test session summary",
          tags: ["Tests"],
          responses: {
            "200": {
              description: "Latest session results",
              content: {
                "application/json": {
                  schema: zodToOpenAPISchema(schemas.SessionResultsSchema),
                },
              },
            },
          },
        },
      },
      "/rpc": {
        post: {
          operationId: "rpcCall",
          summary: "RPC call",
          description: "Execute an RPC method call",
          tags: ["RPC"],
          requestBody: {
            content: {
              "application/json": {
                schema: zodToOpenAPISchema(schemas.RPCRequestSchema),
                example: {
                  method: "analyze",
                  params: { text: "example" },
                  id: "123e4567-e89b-12d3-a456-426614174000",
                },
              },
            },
          },
          responses: {
            "200": {
              description: "RPC response",
              content: {
                "application/json": {
                  schema: zodToOpenAPISchema(schemas.RPCResponseSchema),
                },
              },
            },
          },
        },
      },
      "/mcp/tools": {
        get: {
          operationId: "listMCPTools",
          summary: "List MCP tools",
          description: "Returns available MCP tools",
          tags: ["MCP"],
          responses: {
            "200": {
              description: "List of tools",
              content: {
                "application/json": {
                  schema: {
                    type: "array",
                    items: zodToOpenAPISchema(schemas.MCPToolSchema),
                  },
                },
              },
            },
          },
        },
      },
      "/mcp/execute": {
        post: {
          operationId: "executeMCPTool",
          summary: "Execute MCP tool",
          description: "Execute a tool via MCP protocol",
          tags: ["MCP"],
          requestBody: {
            content: {
              "application/json": {
                schema: zodToOpenAPISchema(schemas.MCPExecuteRequestSchema),
                example: {
                  tool: "analyze",
                  params: { text: "example" },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Tool execution result",
              content: {
                "application/json": {
                  schema: zodToOpenAPISchema(schemas.MCPExecuteResponseSchema),
                },
              },
            },
          },
        },
      },
    },
    components: {
      schemas: {
        Error: zodToOpenAPISchema(schemas.ErrorSchema),
        Success: zodToOpenAPISchema(schemas.SuccessSchema),
        TestDef: zodToOpenAPISchema(schemas.TestDefSchema),
        TestResult: zodToOpenAPISchema(schemas.TestResultSchema),
        TestRunRequest: zodToOpenAPISchema(schemas.TestRunRequestSchema),
        TestRunResponse: zodToOpenAPISchema(schemas.TestRunResponseSchema),
        SessionResults: zodToOpenAPISchema(schemas.SessionResultsSchema),
        HealthSnapshot: zodToOpenAPISchema(schemas.HealthSnapshotSchema),
        WSMessage: zodToOpenAPISchema(schemas.WSMessageSchema),
        RPCRequest: zodToOpenAPISchema(schemas.RPCRequestSchema),
        RPCResponse: zodToOpenAPISchema(schemas.RPCResponseSchema),
        MCPTool: zodToOpenAPISchema(schemas.MCPToolSchema),
        MCPExecuteRequest: zodToOpenAPISchema(schemas.MCPExecuteRequestSchema),
        MCPExecuteResponse: zodToOpenAPISchema(
          schemas.MCPExecuteResponseSchema
        ),
      },
    },
  };

  return JSON.stringify(document, null, 2);
}

/**
 * Generate OpenAPI 3.1.0 YAML document
 */
export function generateOpenAPIYAML(
  baseUrl: string = "https://9to5-scout.hacolby.workers.dev"
): string {
  const json = generateOpenAPIJSON(baseUrl);
  const doc = JSON.parse(json);
  return convertToYAML(doc);
}

function convertToYAML(obj: any, indent: number = 0): string {
  const indentStr = "  ".repeat(indent);
  let yaml = "";

  if (Array.isArray(obj)) {
    for (const item of obj) {
      if (typeof item === "object" && item !== null) {
        yaml += `${indentStr}- ${convertToYAML(item, indent + 1).trim()}\n`;
      } else {
        yaml += `${indentStr}- ${item}\n`;
      }
    }
  } else if (typeof obj === "object" && obj !== null) {
    for (const [key, value] of Object.entries(obj)) {
      if (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value)
      ) {
        yaml += `${indentStr}${key}:\n${convertToYAML(value, indent + 1)}`;
      } else if (Array.isArray(value)) {
        yaml += `${indentStr}${key}:\n${convertToYAML(value, indent + 1)}`;
      } else {
        const val = typeof value === "string" ? `"${value}"` : value;
        yaml += `${indentStr}${key}: ${val}\n`;
      }
    }
  } else {
    yaml += `${indentStr}${obj}\n`;
  }

  return yaml;
}
