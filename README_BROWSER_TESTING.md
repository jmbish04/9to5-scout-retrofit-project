# Browser Testing Setup

This project uses **Playwright** for browser testing of the frontend.

## Installation

```bash
pnpm install
```

This will install `@playwright/test` and required dependencies.

## Running Tests

### Run all browser tests
```bash
pnpm test:browser
```

### Run with UI (interactive mode)
```bash
pnpm test:browser:ui
```

### Run in headed mode (see browser)
```bash
pnpm test:browser:headed
```

### Run specific test file
```bash
pnpm exec playwright test tests/browser/landing.spec.ts
```

## Test Files

- `tests/browser/landing.spec.ts` - Landing page tests
- `tests/browser/health.spec.ts` - Health dashboard tests
- `tests/browser/styling.spec.ts` - Styling consistency tests

## Configuration

The Playwright configuration is in `playwright.config.ts`:

- **Base URL**: `http://localhost:8787` (or set `BASE_URL` env var)
- **Browsers**: Chromium, Firefox, WebKit
- **Mobile**: Pixel 5, iPhone 12
- **Auto-start dev server**: Yes (runs `pnpm dev` before tests)

## Writing Tests

Example test:

```typescript
import { test, expect } from '@playwright/test';

test('should load page', async ({ page }) => {
  await page.goto('/health.html');
  await expect(page.locator('h1')).toContainText('Health Dashboard');
});
```

## CI/CD

Tests run automatically in CI. Set `CI=true` environment variable for CI-specific settings.

## Troubleshooting

### Tests fail to connect
- Ensure dev server is running: `pnpm dev`
- Check base URL in `playwright.config.ts`

### Screenshots
Screenshots are saved on failure in `test-results/` directory.

### Trace Viewer
Run with trace: `pnpm exec playwright test --trace on`

View trace: `pnpm exec playwright show-trace test-results/trace.zip`

