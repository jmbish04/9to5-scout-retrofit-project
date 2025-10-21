/**
 * @module src/new/domains/sites/health.ts
 * @description
 * Health checks for the Site domain, specifically testing the SiteStorageService.
 */

import type { HealthCheck, HealthCheckResult } from '../../core/health';
import { SiteStorageService, SiteStorageEnv } from './site-storage.service';

export class SiteHealthCheck implements HealthCheck {
  public readonly moduleName = 'SiteStorageService';
  private service: SiteStorageService;

  constructor(env: SiteStorageEnv) {
    this.service = new SiteStorageService(env);
  }

  private async runTest(
    name: string,
    testFn: () => Promise<void>
  ): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      await testFn();
      return {
        test: name,
        status: 'pass',
        duration_ms: Date.now() - start,
      };
    } catch (error: unknown) {
      return {
        test: name,
        status: 'fail',
        message: (error as Error).message,
        duration_ms: Date.now() - start,
      };
    }
  }

  public async runChecks(): Promise<HealthCheckResult[]> {
    const results: HealthCheckResult[] = [];
    let testSiteId: string | undefined;

    // Test 1: Create a new site
    results.push(await this.runTest('Create Site', async () => {
      const newSite = await this.service.createSite({
        name: `Health Check Site ${Date.now()}`,
        base_url: `https://health-check-${Date.now()}.example.com`,
        discovery_strategy: 'test',
      });
      if (!newSite || !newSite.id) {
        throw new Error('createSite did not return a valid site with an ID.');
      }
      testSiteId = newSite.id;
    }));

    // Test 2: Get the created site (only if creation succeeded)
    if (testSiteId) {
      const siteIdForGet = testSiteId; // Capture for use in closure
      results.push(await this.runTest('Get Site By ID', async () => {
        const site = await this.service.getSiteById(siteIdForGet);
        if (!site || site.id !== siteIdForGet) {
          throw new Error(`getSiteById failed to retrieve site with ID ${siteIdForGet}.`);
        }
      }));

      // Test 3: Delete the site (cleanup)
      const siteIdForDelete = testSiteId; // Capture for use in closure
      results.push(await this.runTest('Delete Site', async () => {
        await this.service.deleteSite(siteIdForDelete);
        const site = await this.service.getSiteById(siteIdForDelete);
        if (site) {
          throw new Error(`deleteSite failed to remove site with ID ${siteIdForDelete}.`);
        }
      }));
    } else {
      // If creation failed, we can't run the other tests.
      results.push({
        test: 'Get Site By ID',
        status: 'fail',
        message: 'Skipped because Create Site failed.',
        duration_ms: 0,
      });
      results.push({
        test: 'Delete Site',
        status: 'fail',
        message: 'Skipped because Create Site failed.',
        duration_ms: 0,
      });
    }

    return results;
  }
}
