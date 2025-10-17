# OpenAPI Documentation

The 9to5 Scout API automatically generates and serves OpenAPI 3.0 specification documentation.

## Features

- **Automatic Generation**: OpenAPI spec is generated dynamically based on API routes
- **Interactive Documentation**: Swagger UI for testing API endpoints
- **Multiple Formats**: Support for JSON and YAML formats
- **Authentication**: Built-in token management for testing
- **Caching**: Optimized with appropriate cache headers

## Endpoints

### OpenAPI Specification

- **GET** `/openapi.json` - Get OpenAPI specification in JSON format
- **GET** `/openapi.json?format=yaml` - Get OpenAPI specification in YAML format

### Interactive Documentation

- **GET** `/docs` - Swagger UI interface
- **GET** `/api-docs` - Alternative Swagger UI interface

## Usage

### Viewing Documentation

1. **Interactive Documentation**: Visit `/docs` in your browser
2. **Raw Specification**: Visit `/openapi.json` for the raw OpenAPI spec
3. **YAML Format**: Visit `/openapi.json?format=yaml` for YAML format

### Testing API Endpoints

1. Open the Swagger UI at `/docs`
2. Click "Authorize" button
3. Enter your `WORKER_API_KEY` in the format: `Bearer YOUR_API_KEY`
4. Test any endpoint directly from the interface

### Programmatic Access

```bash
# Get OpenAPI spec
curl https://your-worker.dev/openapi.json

# Get YAML format
curl https://your-worker.dev/openapi.json?format=yaml

# Test an endpoint
curl -H "Authorization: Bearer YOUR_API_KEY" \
     https://your-worker.dev/api/jobs
```

## Development

### Generating OpenAPI Spec

```bash
# Generate static OpenAPI.json file
pnpm openapi:generate

# Generate and start dev server
pnpm openapi:serve
```

### Adding New API Routes

1. Add your route handler to the appropriate file in `src/routes/`
2. Import and add the route to `src/index.ts`
3. Update the OpenAPI specification in `src/lib/openapi.ts`
4. Run `pnpm openapi:generate` to update the static file

### Customizing Documentation

Edit `src/lib/openapi.ts` to:

- Add new API routes
- Modify route descriptions
- Add request/response schemas
- Update API metadata

## API Structure

The OpenAPI specification includes:

### Tags

- **General**: Health checks and general operations
- **Jobs**: Job posting management and monitoring
- **Files**: File upload, download, and management
- **Email**: Email configuration and insights
- **Agents**: AI agent management
- **Tasks**: Task management and execution
- **Workflows**: Workflow orchestration
- **Monitoring**: Job monitoring and alerts
- **Scraping**: Web scraping operations
- **Runs**: Execution runs and results
- **Configuration**: System configuration
- **Applicant**: Applicant data and history

### Authentication

All API endpoints (except health check and documentation) require authentication:

```http
Authorization: Bearer YOUR_WORKER_API_KEY
```

### Response Format

Standard response format:

```json
{
  "success": true,
  "data": { ... },
  "error": "Error message if applicable"
}
```

## File Structure

```
src/
├── lib/
│   └── openapi.ts          # OpenAPI generator and route definitions
├── routes/
│   └── openapi.ts          # OpenAPI endpoint handlers
└── index.ts                # Main worker with OpenAPI routes

public/
└── openapi.json            # Static OpenAPI specification (fallback)

scripts/
└── generate-openapi.js     # Script to generate static OpenAPI file
```

## Caching

- OpenAPI specification is cached for 1 hour
- Static file serves as fallback
- Cache headers: `Cache-Control: public, max-age=3600`

## Integration with Cloudflare Workers

The OpenAPI system is fully integrated with Cloudflare Workers:

- **Dynamic Generation**: Uses Worker runtime to generate specs
- **Asset Serving**: Serves static files via ASSETS binding
- **Type Safety**: Full TypeScript support
- **Performance**: Optimized for Cloudflare's edge network

## Troubleshooting

### Common Issues

1. **404 on /docs**: Ensure the route is properly added to `src/index.ts`
2. **Authentication errors**: Verify `WORKER_API_KEY` is set correctly
3. **Outdated spec**: Run `pnpm openapi:generate` to update

### Debug Mode

Enable debug logging by setting the `DEBUG` environment variable:

```bash
DEBUG=openapi wrangler dev
```

## Contributing

When adding new API endpoints:

1. Follow the existing pattern in `src/lib/openapi.ts`
2. Include proper TypeScript types
3. Add comprehensive descriptions
4. Include example requests/responses
5. Update this documentation

## References

- [OpenAPI Specification](https://swagger.io/specification/)
- [Swagger UI](https://swagger.io/tools/swagger-ui/)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
