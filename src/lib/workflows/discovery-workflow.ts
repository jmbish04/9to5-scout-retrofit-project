import type { Env } from '../env';

export class DiscoveryWorkflow {
  async run(env: Env, payload: { config_id?: string }): Promise<any> {
    const { config_id } = payload;

    try {
      const { getSearchConfigs, getSites } = await import('../storage');
      const configs = config_id
        ? [(await env.DB.prepare('SELECT * FROM search_configs WHERE id = ?').bind(config_id).first())]
        : await getSearchConfigs(env);

      const sites = await getSites(env);
      const results = [];

      for (const config of configs.filter(Boolean)) {
        for (const site of sites) {
          const crawlerId = env.SITE_CRAWLER.idFromName(`${site.id}-${config.id}`);
          const crawler = env.SITE_CRAWLER.get(crawlerId);

          const discoveryResponse = await crawler.fetch('http://localhost/start-discovery', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              site_id: site.id,
              base_url: site.base_url,
              search_terms: JSON.parse(config.keywords || '[]'),
            }),
          });

          const discoveryResult = await discoveryResponse.json();
          results.push({
            site: site.name,
            config: config.name,
            ...discoveryResult,
          });

          if (discoveryResult.discovered_count > 0) {
            await crawler.fetch('http://localhost/crawl-urls', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ batch_size: 5 }),
            });
          }
        }
      }

      return { results, total_configs: configs.length, total_sites: sites.length };
    } catch (error) {
      console.error('Discovery workflow error:', error);
      throw error;
    }
  }
}
