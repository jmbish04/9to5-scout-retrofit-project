/**
 * @module src/api/router.ts
 * @description
 * The main API router for the application. This is where all HTTP routes
 * are defined and mapped to their respective service handlers.
 */

import { Hono } from "hono";
import type { Env } from "../config/env";
import appscript from "./routes/appscript.routes";
import documents from "./routes/documents";
import email from "./routes/email";
import { handleHealthGet, handleHealthPost } from "./routes/health";
import jobs from "./routes/jobs";
import scraping from "./routes/scraping";
import sites from "./routes/sites";

const app = new Hono<{ Bindings: Env }>();

// --- Health Routes ---
app.get("/api/health", (c) => handleHealthGet(c.env as any));
app.post("/api/health", (c) => handleHealthPost(c.env as any));

// --- Domain Routes ---
app.route("/api/sites", sites);
app.route("/api/jobs", jobs);
app.route("/api/documents", documents);
app.route("/api/email", email);
app.route("/api/scraping", scraping);
app.route("/api/appscript", appscript);

export default app;
