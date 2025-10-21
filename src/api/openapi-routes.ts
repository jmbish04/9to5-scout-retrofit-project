import type { ApiRoute } from "./openapi-schemas";

/**
 * Predefined API routes for the 9to5 Scout API
 */
export function getPredefinedRoutes(): ApiRoute[] {
  return [
    // Health check
    {
      path: "/api/health",
      method: "GET",
      description: "Health check endpoint",
      tags: ["General"],
      security: [],
    },

    // Jobs API
    {
      path: "/api/jobs",
      method: "GET",
      description: "Get all jobs",
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
    },
    {
      path: "/api/jobs/{id}",
      method: "GET",
      description: "Get job by ID",
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
    },

    // File Management API
    {
      path: "/api/files/upload",
      method: "POST",
      description: "Upload a file",
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
    },
    {
      path: "/api/files/download",
      method: "GET",
      description: "Download a file",
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
    },
    {
      path: "/api/files",
      method: "GET",
      description: "List files",
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
    },
    {
      path: "/api/files/delete",
      method: "DELETE",
      description: "Delete a file",
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
    },
    {
      path: "/api/files/bulk-delete",
      method: "POST",
      description: "Delete multiple files",
      tags: ["Files"],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                type: { type: "string" },
                userId: { type: "string" },
                olderThan: { type: "string", format: "date-time" },
              },
            },
          },
        },
      },
    },
    {
      path: "/api/files/stats",
      method: "GET",
      description: "Get storage statistics",
      tags: ["Files"],
    },
    {
      path: "/api/files/metadata",
      method: "GET",
      description: "Get file metadata",
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
    },

    // Email API
    {
      path: "/api/email/logs",
      method: "GET",
      description: "Get email logs",
      tags: ["Email"],
    },
    {
      path: "/api/email/configs",
      method: "GET",
      description: "Get email configurations",
      tags: ["Email"],
    },
    {
      path: "/api/email/configs",
      method: "PUT",
      description: "Update email configuration",
      tags: ["Email"],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                recipientEmail: { type: "string", format: "email" },
                frequencyHours: { type: "integer" },
                enabled: { type: "boolean" },
              },
            },
          },
        },
      },
    },

    // Scraping API
    {
      path: "/api/scrape/dispatch",
      method: "POST",
      description: "Dispatch scraping job",
      tags: ["Scraping"],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                siteId: { type: "string" },
                urls: {
                  type: "array",
                  items: { type: "string" },
                },
              },
            },
          },
        },
      },
    },

    // Monitoring API
    {
      path: "/api/monitoring/status",
      method: "GET",
      description: "Get monitoring status",
      tags: ["Monitoring"],
    },
    {
      path: "/api/monitoring/queue",
      method: "GET",
      description: "Get monitoring queue",
      tags: ["Monitoring"],
    },

    // Runs API
    {
      path: "/api/runs",
      method: "GET",
      description: "Get execution runs",
      tags: ["Runs"],
    },
    {
      path: "/api/runs/discovery",
      method: "POST",
      description: "Run discovery workflow",
      tags: ["Runs"],
    },
    {
      path: "/api/runs/monitor",
      method: "POST",
      description: "Run monitoring workflow",
      tags: ["Runs"],
    },
  ];
}
