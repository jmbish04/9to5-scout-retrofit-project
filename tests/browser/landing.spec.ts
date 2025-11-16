import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test('should load landing page with hero section', async ({ page }) => {
    await page.goto('/');
    
    // Check hero section
    await expect(page.locator('h1')).toContainText('9to5 Scout');
    await expect(page.locator('text=AI-Powered Career Intelligence')).toBeVisible();
  });

  test('should have working navigation links', async ({ page }) => {
    await page.goto('/');
    
    // Check nav links
    await expect(page.locator('a[href="/health.html"]')).toBeVisible();
    await expect(page.locator('a[href="/openapi.json"]')).toBeVisible();
  });

  test('should have metrics bar', async ({ page }) => {
    await page.goto('/');
    
    const metricsBar = page.locator('#metrics-bar');
    await expect(metricsBar).toBeVisible();
    
    // Check metrics are present
    await expect(page.locator('#metric-status')).toBeVisible();
    await expect(page.locator('#metric-tests')).toBeVisible();
    await expect(page.locator('#metric-uptime')).toBeVisible();
  });

  test('should have fade-in animations', async ({ page }) => {
    await page.goto('/');
    
    // Check that fade-in-up elements exist
    const fadeElements = page.locator('.fade-in-up');
    await expect(fadeElements.first()).toBeVisible();
  });

  test('should have correct background colors', async ({ page }) => {
    await page.goto('/');
    
    // Check hero section has gradient background
    const heroSection = page.locator('section').first();
    const bgColor = await heroSection.evaluate((el) => {
      return window.getComputedStyle(el).backgroundImage;
    });
    
    expect(bgColor).toContain('gradient');
  });
});

test.describe('Navigation', () => {
  test('dropdown should not push content down', async ({ page }) => {
    await page.goto('/');
    
    // Get initial position of hero section
    const heroSection = page.locator('section').first();
    const initialTop = await heroSection.boundingBox().then(box => box?.y);
    
    // Click dropdown
    const dropdownButton = page.locator('#dropdownNavbarLink');
    await dropdownButton.click();
    
    // Wait for dropdown to appear
    await page.waitForSelector('#dropdownNavbar:not(.hidden)', { timeout: 1000 });
    
    // Check hero section hasn't moved
    const afterTop = await heroSection.boundingBox().then(box => box?.y);
    
    expect(afterTop).toBe(initialTop);
  });

  test('dropdown should be absolutely positioned', async ({ page }) => {
    await page.goto('/');
    
    const dropdownButton = page.locator('#dropdownNavbarLink');
    await dropdownButton.click();
    
    const dropdown = page.locator('#dropdownNavbar');
    await expect(dropdown).toBeVisible();
    
    const position = await dropdown.evaluate((el) => {
      return window.getComputedStyle(el).position;
    });
    
    expect(position).toBe('absolute');
  });
});

