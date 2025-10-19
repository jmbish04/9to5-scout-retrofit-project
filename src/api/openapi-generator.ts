import type {
  ApiResponses,
  ApiRoute,
  OpenAPISpec,
} from "./openapi-schemas";
import { getPredefinedRoutes } from "./openapi-routes";

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
 * Generate OpenAPI specification for the 9to5 Scout API
 */
export function generateOpenAPISpec(baseUrl?: string): string {
  const generator = new OpenAPIGenerator(baseUrl);
  generator.addRoutes(getPredefinedRoutes());
  return generator.generateJSON();
}
