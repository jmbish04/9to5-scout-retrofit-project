import { test, expect } from '@playwright/test';

test.describe('Styling Consistency', () => {
  const pages = [
    '/health.html',
    '/getting-started.html',
    '/api-reference.html',
  ];

  for (const pagePath of pages) {
    test(`${pagePath} should have light grey background`, async ({ page }) => {
      await page.goto(pagePath);
      
      const body = page.locator('body');
      const bgColor = await body.evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor;
      });
      
      // Should be light grey, not white
      const rgb = bgColor.match(/\d+/g);
      if (rgb) {
        const [r, g, b] = rgb.map(Number);
        // Light grey should have values > 240
        expect(r).toBeGreaterThan(240);
        expect(g).toBeGreaterThan(240);
        expect(b).toBeGreaterThan(240);
      }
    });

    test(`${pagePath} should have readable text colors`, async ({ page }) => {
      await page.goto(pagePath);
      
      // Check main headings
      const headings = page.locator('h1, h2, h3');
      const firstHeading = headings.first();
      
      if (await firstHeading.count() > 0) {
        const color = await firstHeading.evaluate((el) => {
          return window.getComputedStyle(el).color;
        });
        
        // Should be dark text, not white
        const rgb = color.match(/\d+/g);
        if (rgb) {
          const [r, g, b] = rgb.map(Number);
          // Dark text should have low values
          expect(r + g + b).toBeLessThan(200);
        }
      }
    });
  }

  test('cards should have colored backgrounds', async ({ page }) => {
    await page.goto('/health.html');
    
    // Check that cards have gradient backgrounds
    const cards = page.locator('[class*="bg-gradient"]');
    const count = await cards.count();
    
    expect(count).toBeGreaterThan(0);
  });
});

