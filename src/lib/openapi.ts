/**
 * OpenAPI Specification Generator
 *
 * Automatically generates OpenAPI 3.0 specification based on the Worker's API routes.
 * This module scans the route handlers and creates a comprehensive API documentation.
 */

export interface ApiRoute {
  path: string;
  method: string;
  description?: string;
  parameters?: ApiParameter[];
  requestBody?: ApiRequestBody;
  responses?: ApiResponses;
  tags?: string[];
  security?: ApiSecurity[];
}

export interface ApiParameter {
  name: string;
  in: "query" | "path" | "header" | "cookie";
  required: boolean;
  schema: {
    type: string;
    format?: string;
    enum?: string[];
  };
  description?: string;
}

export interface ApiRequestBody {
  required: boolean;
  content: {
    [mediaType: string]: {
      schema: {
        type: string;
        properties?: Record<string, any>;
        required?: string[];
      };
    };
  };
}

export interface ApiResponses {
  [statusCode: string]: {
    description: string;
    content?: {
      [mediaType: string]: {
        schema: {
          type: string;
          properties?: Record<string, any>;
        };
      };
    };
  };
}

export interface ApiSecurity {
  [securityScheme: string]: string[];
}

export interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description: string;
    contact?: {
      name: string;
      email: string;
      url?: string;
    };
    license?: {
      name: string;
      url: string;
    };
  };
  servers: Array<{
    url: string;
    description: string;
  }>;
  paths: Record<string, Record<string, any>>;
  components: {
    securitySchemes: Record<string, any>;
    schemas: Record<string, any>;
  };
  security: ApiSecurity[];
  tags: Array<{
    name: string;
    description: string;
  }>;
}

export class OpenAPIGenerator {
  private routes: ApiRoute[] = [];
  private baseUrl: string;
  private title: string;
  private version: string;
  private description: string;

  constructor(
    baseUrl: string = "https://9to5-scout.workers.dev",
    title: string = "9to5 Scout API",
    version: string = "1.0.0",
    description: string = "Job scraping and monitoring API built on Cloudflare Workers"
  ) {
    this.baseUrl = baseUrl;
    this.title = title;
    this.version = version;
    this.description = description;
  }

  /**
   * Add a route to the API specification
   */
  addRoute(route: ApiRoute): void {
    this.routes.push(route);
  }

  /**
   * Add multiple routes at once
   */
  addRoutes(routes: ApiRoute[]): void {
    this.routes.push(...routes);
  }

  /**
   * Generate the complete OpenAPI specification
   */
  generateSpec(): OpenAPISpec {
    const paths: Record<string, Record<string, any>> = {};

    // Group routes by path
    this.routes.forEach((route) => {
      if (!paths[route.path]) {
        paths[route.path] = {};
      }

      const operation: Record<string, unknown> = {
        summary:
          route.description || `${route.method.toUpperCase()} ${route.path}`,
        tags: route.tags || this.getDefaultTags(route.path),
        parameters: route.parameters || [],
        responses: route.responses || this.getDefaultResponses(),
        security: route.security || [{ bearerAuth: [] }],
      };

      if (route.requestBody) {
        operation.requestBody = route.requestBody;
      }

      paths[route.path]![route.method.toLowerCase()] = operation;
    });

    return {
      openapi: "3.0.0",
      info: {
        title: this.title,
        version: this.version,
        description: this.description,
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
          url: this.baseUrl,
          description: "Production server",
        },
        {
          url: "https://9to5-scout-dev.workers.dev",
          description: "Development server",
        },
      ],
      paths,
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
        schemas: this.generateSchemas(),
      },
      security: [{ bearerAuth: [] }],
      tags: this.generateTags(),
    };
  }

  /**
   * Generate the OpenAPI spec as JSON string
   */
  generateJSON(): string {
    return JSON.stringify(this.generateSpec(), null, 2);
  }

  /**
   * Get default tags based on path
   */
  private getDefaultTags(path: string): string[] {
    if (path.startsWith("/api/jobs")) return ["Jobs"];
    if (path.startsWith("/api/sites")) return ["Sites"];
    if (path.startsWith("/api/files")) return ["Files"];
    if (path.startsWith("/api/email")) return ["Email"];
    if (path.startsWith("/api/agents")) return ["Agents"];
    if (path.startsWith("/api/tasks")) return ["Tasks"];
    if (path.startsWith("/api/workflows")) return ["Workflows"];
    if (path.startsWith("/api/monitoring")) return ["Monitoring"];
    if (path.startsWith("/api/scrape")) return ["Scraping"];
    if (path.startsWith("/api/runs")) return ["Runs"];
    if (path.startsWith("/api/configs")) return ["Configuration"];
    if (path.startsWith("/api/applicant")) return ["Applicant"];
    return ["General"];
  }

  /**
   * Get default responses for API endpoints
   */
  private getDefaultResponses(): ApiResponses {
    return {
      "200": {
        description: "Successful response",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                success: { type: "boolean" },
                data: { type: "object" },
              },
            },
          },
        },
      },
      "400": {
        description: "Bad request",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                error: { type: "string" },
              },
            },
          },
        },
      },
      "401": {
        description: "Unauthorized",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                error: { type: "string" },
              },
            },
          },
        },
      },
      "404": {
        description: "Not found",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                error: { type: "string" },
              },
            },
          },
        },
      },
      "500": {
        description: "Internal server error",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                error: { type: "string" },
              },
            },
          },
        },
      },
    };
  }

  /**
   * Generate common schemas
   */
  private generateSchemas(): Record<string, any> {
    return {
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
      Site: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          url: { type: "string" },
          enabled: { type: "boolean" },
          lastScraped: { type: "string", format: "date-time" },
          jobCount: { type: "number" },
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
    };
  }

  /**
   * Generate API tags
   */
  private generateTags(): Array<{ name: string; description: string }> {
    return [
      { name: "Jobs", description: "Job posting management and monitoring" },
      { name: "Sites", description: "Job site configuration and management" },
      { name: "Files", description: "File upload, download, and management" },
      { name: "Email", description: "Email configuration and insights" },
      { name: "Agents", description: "AI agent management" },
      { name: "Tasks", description: "Task management and execution" },
      { name: "Workflows", description: "Workflow orchestration" },
      { name: "Monitoring", description: "Job monitoring and alerts" },
      { name: "Scraping", description: "Web scraping operations" },
      { name: "Runs", description: "Execution runs and results" },
      { name: "Configuration", description: "System configuration" },
      { name: "Applicant", description: "Applicant data and history" },
      { name: "General", description: "General API operations" },
    ];
  }
}

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

/**
 * Generate OpenAPI specification for the 9to5 Scout API
 */
export function generateOpenAPISpec(baseUrl?: string): string {
  const generator = new OpenAPIGenerator(baseUrl);
  generator.addRoutes(getPredefinedRoutes());
  return generator.generateJSON();
}
