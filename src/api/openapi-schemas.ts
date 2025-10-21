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
