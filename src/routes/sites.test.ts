import { describe, beforeEach, it, expect, vi } from 'vitest';
import { handleApiRequest } from './api';

vi.mock('html-entities', () => ({
  decode: (value: string) => value,
}));

vi.mock('cloudflare:email', () => ({
  EmailMessage: class {
    constructor() {}
    async send(): Promise<void> {
      // no-op
    }
  },
}));

class MockD1PreparedStatement {
  private params: any[] = [];

  constructor(private readonly db: MockD1Database, private readonly sql: string) {}

  bind(...args: any[]): this {
    this.params = args;
    return this;
  }

  async all(): Promise<{ results: any[] }> {
    return this.db.execute(this.sql, this.params, 'all') as { results: any[] };
  }

  async first<T = any>(): Promise<T | null> {
    const { results } = (await this.all()) as { results: any[] };
    return results.length > 0 ? (results[0] as T) : null;
  }

  async run(): Promise<{ success: boolean }> {
    return this.db.execute(this.sql, this.params, 'run') as { success: boolean };
  }
}

class MockD1Database {
  private sites: any[] = [];

  prepare(sql: string): MockD1PreparedStatement {
    return new MockD1PreparedStatement(this, sql);
  }

  execute(sql: string, params: any[], mode: 'all' | 'run') {
    if (sql.startsWith('INSERT INTO sites')) {
      const [id, name, base_url, robots_txt, sitemap_url, discovery_strategy, last_discovered_at, created_at] = params;
      const site = {
        id,
        name,
        base_url,
        robots_txt,
        sitemap_url,
        discovery_strategy,
        last_discovered_at,
        created_at,
      };
      const existingIndex = this.sites.findIndex((record) => record.id === id);
      if (existingIndex >= 0) {
        this.sites[existingIndex] = site;
      } else {
        this.sites.push(site);
      }
      return { success: true };
    }

    if (sql.startsWith('UPDATE sites SET')) {
      const id = params[params.length - 1];
      const updates = sql
        .slice('UPDATE sites SET '.length, sql.indexOf(' WHERE'))
        .split(',')
        .map((chunk) => chunk.trim().split(' = ')[0]);
      const site = this.sites.find((record) => record.id === id);
      if (site) {
        updates.forEach((field, index) => {
          site[field] = params[index];
        });
      }
      return { success: Boolean(site) };
    }

    if (sql.startsWith('DELETE FROM sites')) {
      const id = params[0];
      const initial = this.sites.length;
      this.sites = this.sites.filter((record) => record.id !== id);
      return { success: this.sites.length < initial };
    }

    if (sql.startsWith('SELECT COUNT(*) as count FROM sites')) {
      return { results: [{ count: this.sites.length }] };
    }

    if (sql.startsWith('SELECT * FROM sites WHERE id')) {
      const id = params[0];
      const site = this.sites.find((record) => record.id === id);
      return { results: site ? [site] : [] };
    }

    if (sql.startsWith('SELECT * FROM sites ORDER BY name')) {
      const limit = params[params.length - 2];
      const offset = params[params.length - 1];
      const sorted = [...this.sites].sort((a, b) => a.name.localeCompare(b.name));
      return { results: sorted.slice(offset, offset + limit) };
    }

    throw new Error(`Unsupported SQL in mock database: ${sql}`);
  }
}

describe('Site management API', () => {
  const API_TOKEN = 'test-token';
  let env: any;

  beforeEach(() => {
    env = {
      DB: new MockD1Database(),
      API_AUTH_TOKEN: API_TOKEN,
    };
  });

  it('creates and lists sites via the API router', async () => {
    const createResponse = await handleApiRequest(
      new Request('https://worker.example/api/sites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${API_TOKEN}`,
        },
        body: JSON.stringify({
          name: 'Example Careers',
          base_url: 'https://example.com',
          discovery_strategy: 'sitemap',
        }),
      }),
      env,
    );

    expect(createResponse.status).toBe(201);
    const created = await createResponse.json();
    expect(created.name).toBe('Example Careers');
    expect(created.base_url).toBe('https://example.com');
    expect(created.discovery_strategy).toBe('sitemap');
    expect(created.id).toBeTruthy();

    const listResponse = await handleApiRequest(
      new Request('https://worker.example/api/sites', {
        headers: { Authorization: `Bearer ${API_TOKEN}` },
      }),
      env,
    );

    expect(listResponse.status).toBe(200);
    const listBody = await listResponse.json();
    expect(Array.isArray(listBody.sites)).toBe(true);
    expect(listBody.sites).toHaveLength(1);
    expect(listBody.sites[0].id).toBe(created.id);
    expect(listBody.pagination.total).toBe(1);
  });
});
