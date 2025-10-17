/**
 * Sites management routes for D1 database operations
 * Handles CRUD operations for job sites configuration
 */
import { Hono } from "hono";
import { z } from "zod";
import { cors, errorHandler, logger, rateLimit, validateBody, validateParams, validateQuery, } from "../lib/hono-validation";
const app = new Hono();
// Apply global middleware
app.use("*", cors());
app.use("*", logger());
app.use("*", rateLimit(100)); // 100 requests per minute
app.use("*", errorHandler());
// Validation schemas
const SiteSchema = z.object({
    id: z.string().min(1, "Site ID is required"),
    name: z.string().min(1, "Site name is required"),
    base_url: z.string().url("Valid base URL is required"),
    robots_txt: z.string().url().optional().nullable(),
    sitemap_url: z.string().url().optional().nullable(),
    discovery_strategy: z.enum(["sitemap", "list", "search", "custom"]),
    last_discovered_at: z.string().datetime().optional().nullable(),
});
const CreateSiteSchema = SiteSchema.omit({ last_discovered_at: true });
const UpdateSiteSchema = SiteSchema.partial().omit({ id: true });
const QuerySchema = z.object({
    strategy: z.enum(["sitemap", "list", "search", "custom"]).optional(),
    limit: z
        .string()
        .transform(Number)
        .pipe(z.number().int().min(1).max(100))
        .optional(),
    offset: z.string().transform(Number).pipe(z.number().int().min(0)).optional(),
});
/**
 * GET /sites
 * Get all job sites with optional filtering
 */
app.get("/", validateQuery(QuerySchema), async (c) => {
    try {
        const { strategy, limit = 50, offset = 0, } = c.get("validatedQuery");
        let query = "SELECT * FROM sites";
        const params = [];
        if (strategy) {
            query += " WHERE discovery_strategy = ?";
            params.push(strategy);
        }
        query += " ORDER BY name LIMIT ? OFFSET ?";
        params.push(limit, offset);
        const result = await c.env.DB.prepare(query)
            .bind(...params)
            .all();
        // Get total count for pagination
        let countQuery = "SELECT COUNT(*) as total FROM sites";
        const countParams = [];
        if (strategy) {
            countQuery += " WHERE discovery_strategy = ?";
            countParams.push(strategy);
        }
        const countResult = await c.env.DB.prepare(countQuery)
            .bind(...countParams)
            .first();
        const total = countResult?.total || 0;
        return c.json({
            sites: result.results,
            pagination: {
                total,
                limit,
                offset,
                hasMore: offset + limit < total,
            },
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error("Failed to fetch sites:", error);
        return c.json({
            error: "Failed to fetch sites",
            details: error instanceof Error ? error.message : "Unknown error",
        }, 500);
    }
});
/**
 * GET /sites/:id
 * Get a specific job site by ID
 */
app.get("/:id", validateParams(z.object({ id: z.string() })), async (c) => {
    try {
        const { id } = c.get("validatedParams");
        const result = await c.env.DB.prepare("SELECT * FROM sites WHERE id = ?")
            .bind(id)
            .first();
        if (!result) {
            return c.json({
                error: "Site not found",
                details: `No site found with ID: ${id}`,
            }, 404);
        }
        return c.json({
            site: result,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error("Failed to fetch site:", error);
        return c.json({
            error: "Failed to fetch site",
            details: error instanceof Error ? error.message : "Unknown error",
        }, 500);
    }
});
/**
 * POST /sites
 * Create a new job site
 */
app.post("/", validateBody(CreateSiteSchema), async (c) => {
    try {
        const siteData = c.get("validatedBody");
        // Check if site already exists
        const existing = await c.env.DB.prepare("SELECT id FROM sites WHERE id = ?")
            .bind(siteData.id)
            .first();
        if (existing) {
            return c.json({
                error: "Site already exists",
                details: `A site with ID '${siteData.id}' already exists`,
            }, 409);
        }
        const insertQuery = `
        INSERT INTO sites (
          id, name, base_url, robots_txt, sitemap_url, 
          discovery_strategy, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
        const result = await c.env.DB.prepare(insertQuery)
            .bind(siteData.id, siteData.name, siteData.base_url, siteData.robots_txt || null, siteData.sitemap_url || null, siteData.discovery_strategy, new Date().toISOString())
            .run();
        if (result.success) {
            // Fetch the created site
            const createdSite = await c.env.DB.prepare("SELECT * FROM sites WHERE id = ?")
                .bind(siteData.id)
                .first();
            return c.json({
                site: createdSite,
                message: "Site created successfully",
                timestamp: new Date().toISOString(),
            }, 201);
        }
        else {
            return c.json({
                error: "Failed to create site",
                details: result.error || "Unknown database error",
            }, 500);
        }
    }
    catch (error) {
        console.error("Failed to create site:", error);
        return c.json({
            error: "Failed to create site",
            details: error instanceof Error ? error.message : "Unknown error",
        }, 500);
    }
});
/**
 * PUT /sites/:id
 * Update an existing job site
 */
app.put("/:id", validateParams(z.object({ id: z.string() })), validateBody(UpdateSiteSchema), async (c) => {
    try {
        const { id } = c.get("validatedParams");
        const updateData = c.get("validatedBody");
        // Check if site exists
        const existing = await c.env.DB.prepare("SELECT id FROM sites WHERE id = ?")
            .bind(id)
            .first();
        if (!existing) {
            return c.json({
                error: "Site not found",
                details: `No site found with ID: ${id}`,
            }, 404);
        }
        // Build dynamic update query
        const updateFields = [];
        const updateValues = [];
        Object.entries(updateData).forEach(([key, value]) => {
            if (value !== undefined) {
                updateFields.push(`${key} = ?`);
                updateValues.push(value);
            }
        });
        if (updateFields.length === 0) {
            return c.json({
                error: "No valid fields to update",
                details: "At least one field must be provided for update",
            }, 400);
        }
        updateFields.push("updated_at = ?");
        updateValues.push(new Date().toISOString());
        updateValues.push(id);
        const updateQuery = `
        UPDATE sites 
        SET ${updateFields.join(", ")} 
        WHERE id = ?
      `;
        const result = await c.env.DB.prepare(updateQuery)
            .bind(...updateValues)
            .run();
        if (result.success) {
            // Fetch the updated site
            const updatedSite = await c.env.DB.prepare("SELECT * FROM sites WHERE id = ?")
                .bind(id)
                .first();
            return c.json({
                site: updatedSite,
                message: "Site updated successfully",
                timestamp: new Date().toISOString(),
            });
        }
        else {
            return c.json({
                error: "Failed to update site",
                details: result.error || "Unknown database error",
            }, 500);
        }
    }
    catch (error) {
        console.error("Failed to update site:", error);
        return c.json({
            error: "Failed to update site",
            details: error instanceof Error ? error.message : "Unknown error",
        }, 500);
    }
});
/**
 * DELETE /sites/:id
 * Delete a job site
 */
app.delete("/:id", validateParams(z.object({ id: z.string() })), async (c) => {
    try {
        const { id } = c.get("validatedParams");
        // Check if site exists
        const existing = await c.env.DB.prepare("SELECT id FROM sites WHERE id = ?")
            .bind(id)
            .first();
        if (!existing) {
            return c.json({
                error: "Site not found",
                details: `No site found with ID: ${id}`,
            }, 404);
        }
        // Check if site has associated jobs
        const jobCount = await c.env.DB.prepare("SELECT COUNT(*) as count FROM jobs WHERE site_id = ?")
            .bind(id)
            .first();
        if (jobCount && jobCount.count > 0) {
            return c.json({
                error: "Cannot delete site with associated jobs",
                details: `Site has ${jobCount.count} associated jobs. Delete jobs first.`,
            }, 409);
        }
        const result = await c.env.DB.prepare("DELETE FROM sites WHERE id = ?")
            .bind(id)
            .run();
        if (result.success) {
            return c.json({
                message: "Site deleted successfully",
                timestamp: new Date().toISOString(),
            });
        }
        else {
            return c.json({
                error: "Failed to delete site",
                details: result.error || "Unknown database error",
            }, 500);
        }
    }
    catch (error) {
        console.error("Failed to delete site:", error);
        return c.json({
            error: "Failed to delete site",
            details: error instanceof Error ? error.message : "Unknown error",
        }, 500);
    }
});
/**
 * GET /sites/:id/jobs
 * Get jobs for a specific site
 */
app.get("/:id/jobs", validateParams(z.object({ id: z.string() })), validateQuery(z.object({
    status: z.enum(["open", "closed", "paused"]).optional(),
    limit: z
        .string()
        .transform(Number)
        .pipe(z.number().int().min(1).max(100))
        .optional(),
    offset: z
        .string()
        .transform(Number)
        .pipe(z.number().int().min(0))
        .optional(),
})), async (c) => {
    try {
        const { id } = c.get("validatedParams");
        const { status, limit = 50, offset = 0, } = c.get("validatedQuery");
        // Check if site exists
        const site = await c.env.DB.prepare("SELECT id, name FROM sites WHERE id = ?")
            .bind(id)
            .first();
        if (!site) {
            return c.json({
                error: "Site not found",
                details: `No site found with ID: ${id}`,
            }, 404);
        }
        let query = "SELECT * FROM jobs WHERE site_id = ?";
        const params = [id];
        if (status) {
            query += " AND status = ?";
            params.push(status);
        }
        query += " ORDER BY first_seen_at DESC LIMIT ? OFFSET ?";
        params.push(limit, offset);
        const result = await c.env.DB.prepare(query)
            .bind(...params)
            .all();
        // Get total count
        let countQuery = "SELECT COUNT(*) as total FROM jobs WHERE site_id = ?";
        const countParams = [id];
        if (status) {
            countQuery += " AND status = ?";
            countParams.push(status);
        }
        const countResult = await c.env.DB.prepare(countQuery)
            .bind(...countParams)
            .first();
        const total = countResult?.total || 0;
        return c.json({
            site: {
                id: site.id,
                name: site.name,
            },
            jobs: result.results,
            pagination: {
                total,
                limit,
                offset,
                hasMore: offset + limit < total,
            },
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error("Failed to fetch site jobs:", error);
        return c.json({
            error: "Failed to fetch site jobs",
            details: error instanceof Error ? error.message : "Unknown error",
        }, 500);
    }
});
export default app;
