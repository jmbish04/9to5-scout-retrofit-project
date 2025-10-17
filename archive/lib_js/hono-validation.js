/**
 * Hono validation middleware using Zod schemas
 */
import { z } from "zod";
/**
 * Parse and validate request body using Zod schema
 */
export function validateBody(schema) {
    return async (c, next) => {
        try {
            const body = await c.req.json();
            const result = schema.safeParse(body);
            if (!result.success) {
                const errors = result.error.issues.map((err) => ({
                    field: err.path.join("."),
                    message: err.message,
                    code: err.code,
                }));
                return c.json({
                    error: "Validation failed",
                    details: "Request body validation failed",
                    validationErrors: errors,
                }, 400);
            }
            // Store validated data in context
            c.set("validatedBody", result.data);
            await next();
        }
        catch (error) {
            if (error instanceof SyntaxError) {
                return c.json({
                    error: "Invalid JSON",
                    details: "Request body must be valid JSON",
                }, 400);
            }
            return c.json({
                error: "Validation error",
                details: "Failed to validate request body",
            }, 400);
        }
    };
}
/**
 * Parse and validate query parameters using Zod schema
 */
export function validateQuery(schema) {
    return async (c, next) => {
        try {
            const query = c.req.query();
            const result = schema.safeParse(query);
            if (!result.success) {
                const errors = result.error.issues.map((err) => ({
                    field: err.path.join("."),
                    message: err.message,
                    code: err.code,
                }));
                return c.json({
                    error: "Validation failed",
                    details: "Query parameters validation failed",
                    validationErrors: errors,
                }, 400);
            }
            // Store validated data in context
            c.set("validatedQuery", result.data);
            await next();
        }
        catch (error) {
            return c.json({
                error: "Validation error",
                details: "Failed to validate query parameters",
            }, 400);
        }
    };
}
/**
 * Parse and validate path parameters using Zod schema
 */
export function validateParams(schema) {
    return async (c, next) => {
        try {
            const params = c.req.param();
            const result = schema.safeParse(params);
            if (!result.success) {
                const errors = result.error.issues.map((err) => ({
                    field: err.path.join("."),
                    message: err.message,
                    code: err.code,
                }));
                return c.json({
                    error: "Validation failed",
                    details: "Path parameters validation failed",
                    validationErrors: errors,
                }, 400);
            }
            // Store validated data in context
            c.set("validatedParams", result.data);
            await next();
        }
        catch (error) {
            return c.json({
                error: "Validation error",
                details: "Failed to validate path parameters",
            }, 400);
        }
    };
}
/**
 * Validate response data using Zod schema
 */
export function validateResponse(schema) {
    return async (c, next) => {
        await next();
        try {
            const response = await c.res.clone().json();
            const result = schema.safeParse(response);
            if (!result.success) {
                console.warn("Response validation failed:", result.error.issues);
                // Don't fail the request, just log the warning
                return;
            }
        }
        catch (error) {
            // Response might not be JSON, that's okay
            console.warn("Could not validate response:", error);
        }
    };
}
/**
 * Error handling middleware for validation errors
 */
export function errorHandler() {
    return async (c, next) => {
        try {
            await next();
        }
        catch (error) {
            console.error("Request error:", error);
            if (error instanceof z.ZodError) {
                const errors = error.issues.map((err) => ({
                    field: Array.isArray(err.path) ? err.path.join(".") : "unknown",
                    message: typeof err.message === "string" ? err.message : "Validation error",
                    code: typeof err.code === "string" ? err.code : "invalid",
                }));
                return c.json({
                    error: "Validation failed",
                    details: "Request validation failed",
                    validationErrors: errors,
                }, 400);
            }
            if (error instanceof Error) {
                return c.json({
                    error: "Internal server error",
                    details: error.message,
                }, 500);
            }
            return c.json({
                error: "Unknown error",
                details: "An unexpected error occurred",
            }, 500);
        }
    };
}
/**
 * CORS middleware for API endpoints
 */
export function cors() {
    return async (c, next) => {
        c.header("Access-Control-Allow-Origin", "*");
        c.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        c.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
        c.header("Access-Control-Max-Age", "86400");
        if (c.req.method === "OPTIONS") {
            return c.body(null, 204);
        }
        await next();
    };
}
/**
 * Rate limiting middleware (basic implementation)
 */
export function rateLimit(requestsPerMinute = 60) {
    const requests = new Map();
    return async (c, next) => {
        const clientId = c.req.header("cf-connecting-ip") || "unknown";
        const now = Date.now();
        const windowMs = 60 * 1000; // 1 minute
        const clientData = requests.get(clientId);
        if (!clientData || now > clientData.resetTime) {
            requests.set(clientId, { count: 1, resetTime: now + windowMs });
        }
        else if (clientData.count >= requestsPerMinute) {
            return c.json({
                error: "Rate limit exceeded",
                details: `Maximum ${requestsPerMinute} requests per minute allowed`,
            }, 429);
        }
        else {
            clientData.count++;
        }
        await next();
    };
}
/**
 * Authentication middleware
 */
export function auth(apiKey) {
    return async (c, next) => {
        const authHeader = c.req.header("Authorization");
        const expectedToken = `Bearer ${apiKey}`;
        if (!authHeader || authHeader !== expectedToken) {
            return c.json({
                error: "Unauthorized",
                details: "Valid API key required",
            }, 401);
        }
        await next();
    };
}
/**
 * Request logging middleware
 */
export function logger() {
    return async (c, next) => {
        const start = Date.now();
        const method = c.req.method;
        const url = c.req.url;
        await next();
        const duration = Date.now() - start;
        const status = c.res.status;
        console.log(`${method} ${url} - ${status} - ${duration}ms`);
    };
}
