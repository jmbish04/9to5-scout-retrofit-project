# Implement Monitoring Dashboard for Phase 12 Services

## Priority: MEDIUM

## Estimated Time: 3-4 hours

## Files Affected: `src/domains/ui/routes/`, `public/`

## Problem

The Phase 12 modularization created new service boundaries and domain separation, but there's no centralized monitoring dashboard to track the health and performance of these services. Need a comprehensive monitoring solution.

## Current Implementation Issues

- No centralized monitoring for refactored services
- Limited visibility into service health
- No performance metrics dashboard
- Missing error tracking and alerting
- No real-time status monitoring

## Required Solution

Create a comprehensive monitoring dashboard that provides real-time visibility into all Phase 12 services, including health status, performance metrics, error rates, and operational insights.

## Implementation Requirements

### 1. Monitoring Service Architecture

```typescript
// src/domains/monitoring/services/monitoring.service.ts
export class MonitoringService {
  constructor(
    private db: D1Database,
    private kv: KVNamespace,
    private analytics: AnalyticsEngineDataset
  ) {}

  async getServiceHealth(): Promise<ServiceHealthStatus> {
    const services = await this.checkAllServices();
    return {
      overall: this.calculateOverallHealth(services),
      services,
      timestamp: new Date().toISOString(),
    };
  }

  async getPerformanceMetrics(
    timeRange: string = "1h"
  ): Promise<PerformanceMetrics> {
    // Query analytics engine for performance data
    return {
      responseTime: await this.getAverageResponseTime(timeRange),
      throughput: await this.getThroughput(timeRange),
      errorRate: await this.getErrorRate(timeRange),
      databaseQueries: await this.getDatabaseMetrics(timeRange),
    };
  }

  async getErrorSummary(): Promise<ErrorSummary> {
    return {
      totalErrors: await this.getTotalErrors(),
      errorRate: await this.getErrorRate("1h"),
      topErrors: await this.getTopErrors(10),
      recentErrors: await this.getRecentErrors(50),
    };
  }
}
```

### 2. Service Health Checks

```typescript
// src/domains/monitoring/services/health-check.service.ts
export class HealthCheckService {
  async checkDatabaseHealth(): Promise<HealthCheckResult> {
    try {
      const startTime = Date.now();
      await this.db.prepare("SELECT 1").first();
      const responseTime = Date.now() - startTime;

      return {
        service: "database",
        status: "healthy",
        responseTime,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        service: "database",
        status: "unhealthy",
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async checkAIServiceHealth(): Promise<HealthCheckResult> {
    try {
      const startTime = Date.now();
      await this.env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
        messages: [{ role: "user", content: "Health check" }],
      });
      const responseTime = Date.now() - startTime;

      return {
        service: "ai",
        status: "healthy",
        responseTime,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        service: "ai",
        status: "unhealthy",
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async checkVectorizeHealth(): Promise<HealthCheckResult> {
    try {
      const startTime = Date.now();
      await this.env.VECTORIZE_INDEX.query([0.1, 0.2, 0.3], { topK: 1 });
      const responseTime = Date.now() - startTime;

      return {
        service: "vectorize",
        status: "healthy",
        responseTime,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        service: "vectorize",
        status: "unhealthy",
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }
}
```

### 3. Monitoring Dashboard UI

```html
<!-- public/monitoring-dashboard.html -->
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>9to5 Scout - Monitoring Dashboard</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  </head>
  <body class="bg-gray-100">
    <div id="navbar-placeholder"></div>

    <div class="container mx-auto px-4 py-8">
      <h1 class="text-3xl font-bold text-gray-900 mb-8">
        System Monitoring Dashboard
      </h1>

      <!-- Service Health Overview -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div class="bg-white rounded-lg shadow p-6">
          <h3 class="text-lg font-semibold text-gray-700 mb-2">
            Overall Health
          </h3>
          <div id="overall-health" class="text-3xl font-bold text-green-600">
            Healthy
          </div>
          <p class="text-sm text-gray-500">
            Last updated: <span id="last-updated">-</span>
          </p>
        </div>

        <div class="bg-white rounded-lg shadow p-6">
          <h3 class="text-lg font-semibold text-gray-700 mb-2">
            Response Time
          </h3>
          <div id="avg-response-time" class="text-3xl font-bold text-blue-600">
            -
          </div>
          <p class="text-sm text-gray-500">Average (ms)</p>
        </div>

        <div class="bg-white rounded-lg shadow p-6">
          <h3 class="text-lg font-semibold text-gray-700 mb-2">Error Rate</h3>
          <div id="error-rate" class="text-3xl font-bold text-red-600">-</div>
          <p class="text-sm text-gray-500">Last hour</p>
        </div>

        <div class="bg-white rounded-lg shadow p-6">
          <h3 class="text-lg font-semibold text-gray-700 mb-2">Throughput</h3>
          <div id="throughput" class="text-3xl font-bold text-purple-600">
            -
          </div>
          <p class="text-sm text-gray-500">Requests/min</p>
        </div>
      </div>

      <!-- Service Status Grid -->
      <div class="bg-white rounded-lg shadow mb-8">
        <div class="px-6 py-4 border-b border-gray-200">
          <h2 class="text-xl font-semibold text-gray-800">Service Status</h2>
        </div>
        <div class="p-6">
          <div
            id="service-status-grid"
            class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            <!-- Service status cards will be populated here -->
          </div>
        </div>
      </div>

      <!-- Performance Charts -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div class="bg-white rounded-lg shadow">
          <div class="px-6 py-4 border-b border-gray-200">
            <h2 class="text-xl font-semibold text-gray-800">
              Response Time Trend
            </h2>
          </div>
          <div class="p-6">
            <canvas id="response-time-chart"></canvas>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow">
          <div class="px-6 py-4 border-b border-gray-200">
            <h2 class="text-xl font-semibold text-gray-800">
              Error Rate Trend
            </h2>
          </div>
          <div class="p-6">
            <canvas id="error-rate-chart"></canvas>
          </div>
        </div>
      </div>

      <!-- Recent Errors -->
      <div class="bg-white rounded-lg shadow">
        <div class="px-6 py-4 border-b border-gray-200">
          <h2 class="text-xl font-semibold text-gray-800">Recent Errors</h2>
        </div>
        <div class="p-6">
          <div id="recent-errors" class="space-y-4">
            <!-- Error items will be populated here -->
          </div>
        </div>
      </div>
    </div>

    <script type="module" src="/js/nav.js"></script>
    <script type="module" src="/js/monitoring-dashboard.js"></script>
  </body>
</html>
```

### 4. Monitoring Dashboard JavaScript

```javascript
// public/js/monitoring-dashboard.js
class MonitoringDashboard {
  constructor() {
    this.charts = {};
    this.refreshInterval = 30000; // 30 seconds
    this.init();
  }

  async init() {
    await this.loadDashboardData();
    this.setupCharts();
    this.startAutoRefresh();
  }

  async loadDashboardData() {
    try {
      const [health, metrics, errors] = await Promise.all([
        fetch("/api/monitoring/health").then((r) => r.json()),
        fetch("/api/monitoring/metrics").then((r) => r.json()),
        fetch("/api/monitoring/errors").then((r) => r.json()),
      ]);

      this.updateHealthOverview(health);
      this.updateServiceStatus(health.services);
      this.updateMetrics(metrics);
      this.updateRecentErrors(errors.recentErrors);
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    }
  }

  updateHealthOverview(health) {
    document.getElementById("overall-health").textContent = health.overall;
    document.getElementById("overall-health").className = `text-3xl font-bold ${
      health.overall === "healthy" ? "text-green-600" : "text-red-600"
    }`;
    document.getElementById("last-updated").textContent = new Date(
      health.timestamp
    ).toLocaleString();
  }

  updateServiceStatus(services) {
    const grid = document.getElementById("service-status-grid");
    grid.innerHTML = "";

    services.forEach((service) => {
      const card = document.createElement("div");
      card.className = `p-4 rounded-lg border ${
        service.status === "healthy"
          ? "bg-green-50 border-green-200"
          : "bg-red-50 border-red-200"
      }`;

      card.innerHTML = `
        <div class="flex items-center justify-between">
          <h3 class="font-semibold text-gray-800">${service.service}</h3>
          <span class="px-2 py-1 rounded text-xs font-medium ${
            service.status === "healthy"
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }">
            ${service.status}
          </span>
        </div>
        <p class="text-sm text-gray-600 mt-2">
          Response: ${service.responseTime || "N/A"}ms
        </p>
        ${
          service.error
            ? `<p class="text-xs text-red-600 mt-1">${service.error}</p>`
            : ""
        }
      `;

      grid.appendChild(card);
    });
  }

  setupCharts() {
    // Response Time Chart
    const responseTimeCtx = document
      .getElementById("response-time-chart")
      .getContext("2d");
    this.charts.responseTime = new Chart(responseTimeCtx, {
      type: "line",
      data: {
        labels: [],
        datasets: [
          {
            label: "Response Time (ms)",
            data: [],
            borderColor: "rgb(59, 130, 246)",
            backgroundColor: "rgba(59, 130, 246, 0.1)",
            tension: 0.1,
          },
        ],
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
          },
        },
      },
    });

    // Error Rate Chart
    const errorRateCtx = document
      .getElementById("error-rate-chart")
      .getContext("2d");
    this.charts.errorRate = new Chart(errorRateCtx, {
      type: "line",
      data: {
        labels: [],
        datasets: [
          {
            label: "Error Rate (%)",
            data: [],
            borderColor: "rgb(239, 68, 68)",
            backgroundColor: "rgba(239, 68, 68, 0.1)",
            tension: 0.1,
          },
        ],
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
          },
        },
      },
    });
  }

  startAutoRefresh() {
    setInterval(() => {
      this.loadDashboardData();
    }, this.refreshInterval);
  }
}

// Initialize dashboard when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new MonitoringDashboard();
});
```

### 5. Monitoring API Routes

```typescript
// src/api/routes/monitoring.routes.ts
export class MonitoringRoutes {
  @Get("/api/monitoring/health")
  async getHealthStatus(): Promise<Response> {
    const monitoringService = new MonitoringService(
      this.db,
      this.kv,
      this.analytics
    );
    const health = await monitoringService.getServiceHealth();
    return Response.json(health);
  }

  @Get("/api/monitoring/metrics")
  async getPerformanceMetrics(
    @Query("timeRange") timeRange: string = "1h"
  ): Promise<Response> {
    const monitoringService = new MonitoringService(
      this.db,
      this.kv,
      this.analytics
    );
    const metrics = await monitoringService.getPerformanceMetrics(timeRange);
    return Response.json(metrics);
  }

  @Get("/api/monitoring/errors")
  async getErrorSummary(): Promise<Response> {
    const monitoringService = new MonitoringService(
      this.db,
      this.kv,
      this.analytics
    );
    const errors = await monitoringService.getErrorSummary();
    return Response.json(errors);
  }

  @Get("/api/monitoring/alerts")
  async getActiveAlerts(): Promise<Response> {
    const alertService = new AlertService(this.kv);
    const alerts = await alertService.getActiveAlerts();
    return Response.json(alerts);
  }
}
```

## Testing Requirements

- Test health check endpoints
- Test monitoring data accuracy
- Test dashboard UI functionality
- Test real-time updates
- Test error handling

## Success Criteria

- [ ] Real-time monitoring dashboard is functional
- [ ] All services are monitored
- [ ] Performance metrics are accurate
- [ ] Error tracking is comprehensive
- [ ] Dashboard is responsive and user-friendly
- [ ] Auto-refresh works correctly
- [ ] Charts display data properly

## Files to Create

- `src/domains/monitoring/services/monitoring.service.ts`
- `src/domains/monitoring/services/health-check.service.ts`
- `src/api/routes/monitoring.routes.ts`
- `public/monitoring-dashboard.html`
- `public/js/monitoring-dashboard.js`

## Dependencies

- Chart.js for data visualization
- Tailwind CSS for styling
- Analytics Engine for metrics
- KV for caching

## Migration Strategy

1. Create monitoring services
2. Implement health checks
3. Build dashboard UI
4. Add API routes
5. Test monitoring functionality
6. Deploy and verify
