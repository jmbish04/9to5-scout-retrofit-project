import { test, expect } from '@playwright/test';

test.describe('Health Dashboard', () => {
  test('should load health dashboard', async ({ page }) => {
    await page.goto('/health.html');
    
    await expect(page.locator('h1')).toContainText('Health Dashboard');
    await expect(page.locator('#run-tests-btn')).toBeVisible();
  });

  test('should have correct background color', async ({ page }) => {
    await page.goto('/health.html');
    
    const body = page.locator('body');
    const bgColor = await body.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });
    
    // Should be light grey (slate-100)
    expect(bgColor).toMatch(/rgb\(241|248|251/);
  });

  test('should have colored cards', async ({ page }) => {
    await page.goto('/health.html');
    
    // Check test list card has gradient background
    const testCard = page.locator('#tests-list').locator('..');
    const bgImage = await testCard.evaluate((el) => {
      return window.getComputedStyle(el).backgroundImage;
    });
    
    expect(bgImage).toContain('gradient');
  });

  test('should load test definitions', async ({ page }) => {
    await page.goto('/health.html');
    
    // Wait for API call
    await page.waitForResponse(response => 
      response.url().includes('/api/tests/defs') && response.status() === 200
    );
    
    const testsList = page.locator('#tests-list');
    await expect(testsList).not.toContainText('Loading tests...');
  });

  test('should run tests on button click', async ({ page }) => {
    await page.goto('/health.html');
    
    // Intercept API calls
    await page.route('**/api/tests/run', route => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          sessionUuid: 'test-session-123',
          status: 'running',
          totalTests: 6,
          startedAt: new Date().toISOString(),
        }),
      });
    });
    
    const runButton = page.locator('#run-tests-btn');
    await runButton.click();
    
    // Check button state changes
    await expect(page.locator('#run-tests-text')).toContainText('Running Tests...');
  });
});

