# 9to5 Scout Documentation

Welcome to the 9to5 Scout documentation. This comprehensive guide covers all aspects of the AI-powered job application assistant built on Cloudflare Workers.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [API Reference](#api-reference)
- [Agent Guidelines](#agent-guidelines)
- [Python Integration](#python-integration)
- [Frontend Development](#frontend-development)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

## Overview

9to5 Scout is an AI-powered job application assistant that automates and enhances the job search process. It intelligently scrapes job postings, generates tailored application materials, and provides actionable insights to help job seekers succeed.

### Key Features

- **Intelligent Job Scraping**: Uses Browser Rendering API to handle dynamic, JavaScript-heavy job sites
- **AI-Powered Content Generation**: Creates customized resumes and cover letters using Workers AI
- **Real-time Monitoring**: Tracks job posting changes and provides notifications
- **WebSocket Integration**: Real-time communication between Python scrapers and the worker
- **Vector Search**: Semantic search capabilities for job matching and skill analysis

## Architecture

The system is built on Cloudflare Workers with the following key components:

### Core Technologies

- **Cloudflare Workers**: Serverless compute platform
- **D1 Database**: SQLite-compatible database for structured data
- **Workers AI**: AI inference for content generation and analysis
- **Browser Rendering**: Headless browser for dynamic content scraping
- **Vectorize**: Vector database for semantic search
- **Durable Objects**: Stateful coordination for WebSocket connections
- **Workflows**: Long-running, multi-step processes
- **R2 Storage**: Object storage for large files and snapshots
- **Workers KV**: Key-value storage for configuration and caching

### Data Flow

1. **Job Discovery**: Workflows orchestrate job discovery across multiple sites
2. **Content Scraping**: Browser Rendering API extracts job details from dynamic sites
3. **Data Processing**: Workers AI analyzes and structures job information
4. **Storage**: Data is stored in D1 (structured) and R2 (unstructured)
5. **Vectorization**: Job descriptions are embedded and stored in Vectorize
6. **Monitoring**: Durable Objects track job changes over time
7. **WebSocket Communication**: Real-time updates to connected clients

## Getting Started

### Prerequisites

- Node.js 18+ and npm/pnpm
- Python 3.11+ (for JobSpy integration)
- Cloudflare account with Workers access
- Wrangler CLI installed globally

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd 9to5-scout
```

2. Install dependencies:

```bash
npm install
# or
pnpm install
```

3. Set up Python environment:

```bash
cd python-node
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

4. Configure environment variables:

```bash
cp .env.example .env
# Edit .env with your configuration
```

5. Deploy to Cloudflare:

```bash
npx wrangler deploy
```

### Configuration

The worker requires several bindings and environment variables. See [Configuration Guide](configuration.md) for detailed setup instructions.

## API Reference

The worker exposes a RESTful API with the following endpoints:

### Core Endpoints

- `GET /api/sites` - List all configured job sites
- `POST /api/sites` - Add a new job site
- `GET /api/sites/:id` - Get site details
- `GET /api/jobs` - List jobs with filtering
- `GET /api/jobs/:id` - Get job details
- `POST /api/jobs/:id/monitor` - Start monitoring a job

### WebSocket Endpoints

- `WS /ws` - Main WebSocket connection for real-time updates
- `WS /ws/scrape` - WebSocket for Python scraper integration

### Search Endpoints

- `GET /api/search?q=query` - Semantic search across jobs
- `GET /api/search/skills?job_id=:id` - Find relevant skills for a job

See [API Reference](api-reference.md) for complete documentation.

## Agent Guidelines

The system includes comprehensive AI agent guidelines for different AI assistants:

- [Claude Agent Guidelines](claude-agent.md)
- [Cursor Agent Guidelines](cursor-agent.md)
- [GitHub Copilot Guidelines](copilot-agent.md)
- [Gemini Agent Guidelines](gemini-agent.md)

Each agent is configured with specific instructions for working with the 9to5 Scout codebase.

## Python Integration

The JobSpy Python module provides WebSocket integration for job scraping:

### Features

- Real-time WebSocket communication with the worker
- Automatic reconnection and heartbeat management
- Structured data transmission for scraped content
- Authentication support via API tokens

### Usage

```python
from jobspy.scout.websocket_client import connect

# Connect to the worker
connect()
```

See [Python Integration Guide](python-integration.md) for detailed usage.

## Frontend Development

The frontend is built with static HTML files served via Workers Static Assets:

### Structure

- `public/` - Static assets directory
- `public/index.html` - Main dashboard
- `public/api-reference.html` - API documentation
- `public/templates/` - HTML templates for generated content

### Shared Components

- `public/js/shared.js` - Shared JavaScript utilities
- `public/css/shared.css` - Common styles
- `public/js/navbar.js` - Consistent navigation

See [Frontend Development Guide](frontend-development.md) for details.

## Deployment

### Development

```bash
npx wrangler dev
```

### Production

```bash
npx wrangler deploy
```

### Database Migrations

```bash
npx wrangler d1 migrations apply 9to5-scout-db
```

See [Deployment Guide](deployment.md) for complete instructions.

## Troubleshooting

### Common Issues

1. **WebSocket Connection Failures**: Check authentication tokens and network connectivity
2. **Database Errors**: Verify D1 bindings and migration status
3. **AI Generation Issues**: Check Workers AI quotas and model availability
4. **Scraping Failures**: Verify Browser Rendering bindings and site accessibility

### Debugging

Enable detailed logging:

```bash
npx wrangler tail --format=pretty
```

See [Troubleshooting Guide](troubleshooting.md) for more solutions.

## Contributing

Please read our [Contributing Guidelines](contributing.md) before submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
