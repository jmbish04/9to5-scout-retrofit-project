/**
 * @module src/new/api/openapi-generator.ts
 * @description
 * This module contains a refactored OpenAPI specification generator.
 * It replaces the previous if-chain for tag mapping with a scalable,
 * configuration-based approach.
 */

import type { ApiRoute, OpenAPISpec } from "./openapi-schemas"; // Assuming schemas are also migrated

export class OpenAPIGenerator {
  private routes: ApiRoute[] = [];
  private baseUrl: string;
  private title: string;
  private version: string;
  private description: string;

  // **Refactored:** A scalable mapping for URL prefixes to OpenAPI tags.
  private static readonly TAG_MAPPING: Map<string, string> = new Map([
    ['/api/jobs', 'Jobs'],
    ['/api/sites', 'Sites'],
    ['/api/files', 'Files'],
    ['/api/email', 'Email'],
    ['/api/agents', 'Agents'],
    ['/api/tasks', 'Tasks'],
    ['/api/workflows', 'Workflows'],
    ['/api/monitoring', 'Monitoring'],
    ['/api/scrape', 'Scraping'],
    ['/api/runs', 'Runs'],
    ['/api/configs', 'Configuration'],
    ['/api/applicant', 'Applicant'],
    ['/api/docs', 'Documents'],
    ['/api/companies', 'Company Intelligence'],
  ]);

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

  addRoutes(routes: ApiRoute[]): void {
    this.routes.push(...routes);
  }

  /**
   * **Refactored:** Determines the correct OpenAPI tag for a given path.
   * It iterates through the TAG_MAPPING configuration to find a match.
   * This is more maintainable than a long if-chain.
   */
  private getDefaultTags(path: string): string[] {
    for (const [prefix, tag] of OpenAPIGenerator.TAG_MAPPING.entries()) {
      if (path.startsWith(prefix)) {
        return [tag];
      }
    }
    return ["General"];
  }

  generateSpec(): OpenAPISpec {
    const paths: Record<string, Record<string, any>> = {};

    this.routes.forEach((route) => {
      if (!paths[route.path]) {
        paths[route.path] = {};
      }
      paths[route.path]![route.method.toLowerCase()] = {
        summary: route.description || `${route.method.toUpperCase()} ${route.path}`,
        tags: route.tags || this.getDefaultTags(route.path),
        // ... other properties like parameters, responses, etc.
      };
    });

    return {
      openapi: "3.0.0",
      info: {
        title: this.title,
        version: this.version,
        description: this.description,
      },
      servers: [{ url: this.baseUrl }],
      paths,
      // ... other spec components
    };
  }

  generateJSON(): string {
    return JSON.stringify(this.generateSpec(), null, 2);
  }
}
