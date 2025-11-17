/**
 * @module src/schemas/apiSchemas.ts
 * @description
 * Zod schemas for API requests, responses, and errors.
 * Used for validation and OpenAPI generation.
 */

import { z } from "zod";

// ============================================================================
// Common Schemas
// ============================================================================

export const ErrorSchema = z.object({
  error: z.string(),
  code: z.string().optional(),
  details: z.record(z.string(), z.unknown()).optional(),
  requestId: z.string().optional(),
});

export const SuccessSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  data: z.unknown().optional(),
});

// ============================================================================
// Test Schemas
// ============================================================================

export const TestDefSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string(),
  category: z.string().optional(),
  severity: z.string().optional(),
  isActive: z.boolean(),
  errorMap: z
    .record(
      z.string(),
      z.object({
        meaning: z.string(),
        fix: z.string(),
      })
    )
    .optional(),
  createdAt: z.string().datetime(),
});

export const TestResultSchema = z.object({
  id: z.string().uuid(),
  sessionUuid: z.string().uuid(),
  testFk: z.string().uuid(),
  startedAt: z.string().datetime(),
  finishedAt: z.string().datetime().nullable(),
  durationMs: z.number().int().nullable(),
  status: z.enum(["pass", "fail"]),
  errorCode: z.string().nullable(),
  raw: z.string().nullable(),
  aiHumanReadableErrorDescription: z.string().nullable(),
  aiPromptToFixError: z.string().nullable(),
  createdAt: z.string().datetime(),
});

export const TestRunRequestSchema = z.object({
  testIds: z.array(z.string().uuid()).optional(),
  includeInactive: z.boolean().default(false),
});

export const TestRunResponseSchema = z.object({
  sessionUuid: z.string().uuid(),
  status: z.enum(["running", "completed"]),
  totalTests: z.number().int(),
  startedAt: z.string().datetime(),
});

export const SessionResultsSchema = z.object({
  sessionUuid: z.string().uuid(),
  totalTests: z.number().int(),
  passed: z.number().int(),
  failed: z.number().int(),
  finishedAt: z.string().datetime().nullable(),
  results: z.array(
    TestResultSchema.extend({
      testName: z.string(),
      testDescription: z.string(),
      category: z.string().nullable(),
      severity: z.string().nullable(),
    })
  ),
});

export const HealthSnapshotSchema = z.object({
  status: z.enum(["healthy", "degraded", "unhealthy"]),
  uptime: z.number().int(),
  lastTestSession: z.object({
    sessionUuid: z.string().uuid().nullable(),
    finishedAt: z.string().datetime().nullable(),
    passed: z.number().int(),
    failed: z.number().int(),
    totalTests: z.number().int(),
  }),
  timestamp: z.string().datetime(),
});

// ============================================================================
// WebSocket Message Schemas
// ============================================================================

export const WSMessageSchema = z.object({
  type: z.string(),
  payload: z.unknown(),
  meta: z
    .object({
      timestamp: z.string().datetime(),
      requestId: z.string().uuid().optional(),
      userId: z.string().optional(),
    })
    .optional(),
});

export const WSConnectSchema = z.object({
  type: z.literal("connect"),
  room: z.string(),
});

export const WSBroadcastSchema = z.object({
  type: z.literal("broadcast"),
  room: z.string(),
  message: WSMessageSchema,
});

// ============================================================================
// RPC Schemas
// ============================================================================

export const RPCRequestSchema = z.object({
  method: z.string(),
  params: z.record(z.string(), z.unknown()).optional(),
  id: z.string().uuid().optional(),
});

export const RPCResponseSchema = z.object({
  result: z.unknown().optional(),
  error: ErrorSchema.optional(),
  id: z.string().uuid().optional(),
});

// ============================================================================
// MCP Schemas
// ============================================================================

export const MCPToolSchema = z.object({
  name: z.string(),
  description: z.string(),
  inputSchema: z.record(z.string(), z.unknown()),
});

export const MCPExecuteRequestSchema = z.object({
  tool: z.string(),
  params: z.record(z.string(), z.unknown()),
});

export const MCPExecuteResponseSchema = z.object({
  result: z.unknown(),
  error: z.string().optional(),
});

// ============================================================================
// Type Exports
// ============================================================================

export type Error = z.infer<typeof ErrorSchema>;
export type TestDef = z.infer<typeof TestDefSchema>;
export type TestResult = z.infer<typeof TestResultSchema>;
export type TestRunRequest = z.infer<typeof TestRunRequestSchema>;
export type TestRunResponse = z.infer<typeof TestRunResponseSchema>;
export type SessionResults = z.infer<typeof SessionResultsSchema>;
export type HealthSnapshot = z.infer<typeof HealthSnapshotSchema>;
export type WSMessage = z.infer<typeof WSMessageSchema>;
export type RPCRequest = z.infer<typeof RPCRequestSchema>;
export type RPCResponse = z.infer<typeof RPCResponseSchema>;
export type MCPTool = z.infer<typeof MCPToolSchema>;
export type MCPExecuteRequest = z.infer<typeof MCPExecuteRequestSchema>;
export type MCPExecuteResponse = z.infer<typeof MCPExecuteResponseSchema>;
