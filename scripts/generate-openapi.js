#!/usr/bin/env node

/**
 * OpenAPI Generation Script
 *
 * This script generates the OpenAPI specification and updates the static file.
 * Run this script whenever API routes are added or modified.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Replicate __dirname functionality in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import the OpenAPI generator (we'll need to compile this to JS or use a different approach)
// For now, we'll generate a basic OpenAPI spec

export const generateOpenAPISpec = () => {
  return {
    openapi: "3.0.0",
    info: {
      title: "9to5 Scout API",
      version: "1.0.0",
      description:
        "Job scraping and monitoring API built on Cloudflare Workers",
      contact: {
        name: "9to5 Scout Support",
        email: "support@9to5scout.dev",
      },
      license: {
        name: "MIT",
        url: "https://opensource.org/licenses/MIT",
      },
    },
    servers: [
      {
        url: "https://9to5-scout.workers.dev",
        description: "Production server",
      },
      {
        url: "https://9to5-scout-dev.workers.dev",
        description: "Development server",
      },
    ],
    paths: {
      "/api/health": {
        get: {
          summary: "Health check endpoint",
          tags: ["General"],
          responses: {
            200: {
              description: "Successful response",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      status: { type: "string" },
                      timestamp: { type: "string", format: "date-time" },
                      version: { type: "string" },
                    },
                  },
                },
              },
            },
          },
          security: [],
        },
      },
      "/openapi.json": {
        get: {
          summary: "Get OpenAPI specification",
          tags: ["General"],
          parameters: [
            {
              name: "format",
              in: "query",
              required: false,
              schema: { type: "string", enum: ["json", "yaml"] },
              description: "Response format",
            },
          ],
          responses: {
            200: {
              description: "OpenAPI specification",
              content: {
                "application/json": {
                  schema: { type: "object" },
                },
                "text/yaml": {
                  schema: { type: "string" },
                },
              },
            },
          },
          security: [],
        },
      },
      "/docs": {
        get: {
          summary: "API documentation (Swagger UI)",
          tags: ["General"],
          responses: {
            200: {
              description: "Swagger UI HTML page",
              content: {
                "text/html": {
                  schema: { type: "string" },
                },
              },
            },
          },
          security: [],
        },
      },
      "/api/jobs": {
        get: {
          summary: "Get all jobs",
          tags: ["Jobs"],
          parameters: [
            {
              name: "limit",
              in: "query",
              required: false,
              schema: { type: "integer", format: "int32" },
              description: "Number of jobs to return",
            },
            {
              name: "offset",
              in: "query",
              required: false,
              schema: { type: "integer", format: "int32" },
              description: "Number of jobs to skip",
            },
          ],
          responses: {
            200: {
              description: "Successful response",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      data: {
                        type: "array",
                        items: { $ref: "#/components/schemas/Job" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/api/jobs/{id}": {
        get: {
          summary: "Get job by ID",
          tags: ["Jobs"],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
              description: "Job ID",
            },
          ],
          responses: {
            200: {
              description: "Successful response",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      data: { $ref: "#/components/schemas/Job" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/api/files/upload": {
        post: {
          summary: "Upload a file",
          tags: ["Files"],
          parameters: [
            {
              name: "type",
              in: "query",
              required: true,
              schema: {
                type: "string",
                enum: [
                  "resume",
                  "cover-letter",
                  "job-posting",
                  "scraped-content",
                  "email-template",
                  "report",
                  "backup",
                  "temp",
                  "misc",
                ],
              },
              description: "File type",
            },
            {
              name: "userId",
              in: "query",
              required: false,
              schema: { type: "string" },
              description: "User ID",
            },
          ],
          requestBody: {
            required: true,
            content: {
              "multipart/form-data": {
                schema: {
                  type: "object",
                  properties: {
                    file: {
                      type: "string",
                      format: "binary",
                    },
                  },
                },
              },
            },
          },
          responses: {
            201: {
              description: "File uploaded successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      file: { $ref: "#/components/schemas/File" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/api/files/download": {
        get: {
          summary: "Download a file",
          tags: ["Files"],
          parameters: [
            {
              name: "key",
              in: "query",
              required: true,
              schema: { type: "string" },
              description: "File key",
            },
          ],
          responses: {
            200: {
              description: "File content",
              content: {
                "application/octet-stream": {
                  schema: { type: "string", format: "binary" },
                },
              },
            },
          },
        },
      },
      "/api/files": {
        get: {
          summary: "List files",
          tags: ["Files"],
          parameters: [
            {
              name: "type",
              in: "query",
              required: false,
              schema: {
                type: "string",
                enum: [
                  "resume",
                  "cover-letter",
                  "job-posting",
                  "scraped-content",
                  "email-template",
                  "report",
                  "backup",
                  "temp",
                  "misc",
                ],
              },
              description: "Filter by file type",
            },
            {
              name: "userId",
              in: "query",
              required: false,
              schema: { type: "string" },
              description: "Filter by user ID",
            },
            {
              name: "limit",
              in: "query",
              required: false,
              schema: { type: "integer", format: "int32" },
              description: "Number of files to return",
            },
          ],
          responses: {
            200: {
              description: "Successful response",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      files: {
                        type: "array",
                        items: { $ref: "#/components/schemas/File" },
                      },
                      count: { type: "integer" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description:
            "API key for authentication. Include as: Bearer <WORKER_API_KEY>",
        },
      },
      schemas: {
        Job: {
          type: "object",
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            company: { type: "string" },
            location: { type: "string" },
            url: { type: "string" },
            description: { type: "string" },
            postedAt: { type: "string", format: "date-time" },
            siteId: { type: "string" },
            status: { type: "string", enum: ["active", "expired", "scraped"] },
          },
        },
        File: {
          type: "object",
          properties: {
            key: { type: "string" },
            url: { type: "string" },
            size: { type: "number" },
            uploadedAt: { type: "string", format: "date-time" },
            metadata: {
              type: "object",
              properties: {
                type: { type: "string" },
                userId: { type: "string" },
                originalName: { type: "string" },
              },
            },
          },
        },
        Error: {
          type: "object",
          properties: {
            error: { type: "string" },
            message: { type: "string" },
            code: { type: "string" },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: "General", description: "General API operations" },
      { name: "Jobs", description: "Job posting management and monitoring" },
      { name: "Files", description: "File upload, download, and management" },
    ],
  };
};

export const main = () => {
  try {
    console.log("Generating OpenAPI specification...");

    const spec = generateOpenAPISpec();
    const specJson = JSON.stringify(spec, null, 2);

    // Write to public directory
    const publicPath = path.join(__dirname, "..", "public", "openapi.json");
    fs.writeFileSync(publicPath, specJson);

    console.log("✅ OpenAPI specification generated successfully!");
    console.log(`📁 Written to: ${publicPath}`);
    console.log(`📊 Total paths: ${Object.keys(spec.paths).length}`);
    console.log(`🏷️  Total tags: ${spec.tags.length}`);
  } catch (error) {
    console.error("❌ Error generating OpenAPI specification:", error);
    process.exit(1);
  }
};

// Check if the script is being run directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
