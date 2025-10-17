// src/routes/talent.ts
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { QuerySchema } from "../lib/schemas";
import type { Env } from "../lib/talent";
import { searchJobs } from "../lib/talent";

const app = new Hono<{ Bindings: Env }>();

app.use("/api/talent", cors({ origin: "*", allowMethods: ["GET", "OPTIONS"] }));

app.get(
  "/api/talent",
  zValidator("query", QuerySchema, (result, c) => {
    if (!result.success) {
      return c.json(
        { error: "invalid_query", details: result.error.issues },
        400
      );
    }
  }),
  async (c) => {
    const { q, location, n, provider } = c.req.valid("query");
    const data = await searchJobs(c.env, q, location, n, provider);
    return c.json(data, 200);
  }
);

// Cloudflare Workers export
export default app as unknown as ExportedHandler<Env>;
