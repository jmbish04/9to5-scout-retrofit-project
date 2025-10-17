/**
 * OpenAPI Specification Route Handler
 *
 * Handles requests for the OpenAPI specification and related documentation.
 */
import { generateOpenAPISpec } from "../lib/openapi";
/**
 * Handle OpenAPI specification requests
 */
export async function handleOpenAPI(request, env) {
    try {
        const url = new URL(request.url);
        const format = url.searchParams.get("format") || "json";
        const baseUrl = url.origin;
        // Generate the OpenAPI specification
        const spec = generateOpenAPISpec(baseUrl);
        if (format === "yaml") {
            // Convert JSON to YAML (basic implementation)
            const yamlSpec = jsonToYaml(JSON.parse(spec));
            return new Response(yamlSpec, {
                headers: {
                    "Content-Type": "text/yaml",
                    "Cache-Control": "public, max-age=3600", // Cache for 1 hour
                },
            });
        }
        // Return JSON format by default
        return new Response(spec, {
            headers: {
                "Content-Type": "application/json",
                "Cache-Control": "public, max-age=3600", // Cache for 1 hour
            },
        });
    }
    catch (error) {
        console.error("OpenAPI generation error:", error);
        return new Response(JSON.stringify({ error: "Failed to generate OpenAPI specification" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
/**
 * Handle OpenAPI documentation requests (Swagger UI)
 */
export async function handleOpenAPIDocs(request, env) {
    try {
        const url = new URL(request.url);
        const baseUrl = url.origin;
        const openApiUrl = `${baseUrl}/openapi.json`;
        // Generate Swagger UI HTML
        const swaggerUI = generateSwaggerUI(openApiUrl);
        return new Response(swaggerUI, {
            headers: {
                "Content-Type": "text/html",
                "Cache-Control": "public, max-age=3600",
            },
        });
    }
    catch (error) {
        console.error("OpenAPI docs generation error:", error);
        return new Response(JSON.stringify({ error: "Failed to generate OpenAPI documentation" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
/**
 * Convert JSON to YAML (basic implementation)
 */
function jsonToYaml(obj, indent = 0) {
    const spaces = "  ".repeat(indent);
    if (typeof obj === "string") {
        return `"${obj}"`;
    }
    if (typeof obj === "number" || typeof obj === "boolean" || obj === null) {
        return String(obj);
    }
    if (Array.isArray(obj)) {
        if (obj.length === 0)
            return "[]";
        return obj
            .map((item) => `${spaces}- ${jsonToYaml(item, indent + 1)}`)
            .join("\n");
    }
    if (typeof obj === "object") {
        const entries = Object.entries(obj);
        if (entries.length === 0)
            return "{}";
        return entries
            .map(([key, value]) => {
            const yamlValue = jsonToYaml(value, indent + 1);
            return `${spaces}${key}: ${yamlValue}`;
        })
            .join("\n");
    }
    return String(obj);
}
/**
 * Generate Swagger UI HTML
 */
function generateSwaggerUI(openApiUrl) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>9to5 Scout API Documentation</title>
  <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui.css" />
  <style>
    html {
      box-sizing: border-box;
      overflow: -moz-scrollbars-vertical;
      overflow-y: scroll;
    }
    *, *:before, *:after {
      box-sizing: inherit;
    }
    body {
      margin:0;
      background: #fafafa;
    }
    .swagger-ui .topbar {
      background-color: #f8f9fa;
      border-bottom: 1px solid #dee2e6;
    }
    .swagger-ui .topbar .download-url-wrapper {
      display: none;
    }
    .swagger-ui .info .title {
      color: #2c3e50;
    }
    .swagger-ui .scheme-container {
      background: #f8f9fa;
      border: 1px solid #dee2e6;
    }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      const ui = SwaggerUIBundle({
        url: '${openApiUrl}',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "StandaloneLayout",
        tryItOutEnabled: true,
        requestInterceptor: function(request) {
          // Add authentication header if available
          const token = localStorage.getItem('api_token');
          if (token) {
            request.headers['Authorization'] = 'Bearer ' + token;
          }
          return request;
        },
        onComplete: function() {
          // Add token input field
          const topbar = document.querySelector('.swagger-ui .topbar');
          if (topbar) {
            const tokenInput = document.createElement('div');
            tokenInput.innerHTML = \`
              <div style="display: flex; align-items: center; gap: 10px; margin: 10px 0;">
                <label for="api-token" style="font-weight: bold;">API Token:</label>
                <input 
                  type="password" 
                  id="api-token" 
                  placeholder="Enter your WORKER_API_KEY" 
                  style="padding: 5px; border: 1px solid #ccc; border-radius: 3px; width: 300px;"
                />
                <button 
                  onclick="setToken()" 
                  style="padding: 5px 10px; background: #007bff; color: white; border: none; border-radius: 3px; cursor: pointer;"
                >
                  Set Token
                </button>
                <button 
                  onclick="clearToken()" 
                  style="padding: 5px 10px; background: #6c757d; color: white; border: none; border-radius: 3px; cursor: pointer;"
                >
                  Clear
                </button>
              </div>
            \`;
            topbar.appendChild(tokenInput);
          }
        }
      });
      
      window.setToken = function() {
        const token = document.getElementById('api-token').value;
        if (token) {
          localStorage.setItem('api_token', token);
          alert('Token set! Refresh the page to use it in requests.');
        }
      };
      
      window.clearToken = function() {
        localStorage.removeItem('api_token');
        document.getElementById('api-token').value = '';
        alert('Token cleared!');
      };
      
      // Load saved token
      const savedToken = localStorage.getItem('api_token');
      if (savedToken) {
        document.getElementById('api-token').value = savedToken;
      }
    };
  </script>
</body>
</html>`;
}
