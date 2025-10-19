import type { Run, SearchConfig } from "../../../lib/types";

export interface StorageEnv {
  DB: D1Database;
  R2: R2Bucket;
}

/**
 * Save a search configuration.
 */
export async function saveSearchConfig(
  env: StorageEnv,
  config: SearchConfig
): Promise<string> {
  const id = config.id || crypto.randomUUID();

  await env.DB.prepare(
    `INSERT OR REPLACE INTO search_configs(
      id, name, keywords, locations, include_domains,
      exclude_domains, min_comp_total, created_at, updated_at
    ) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9)`
  )
    .bind(
      id,
      config.name,
      config.keywords,
      config.locations,
      config.include_domains,
      config.exclude_domains,
      config.min_comp_total,
      config.created_at || new Date().toISOString(),
      new Date().toISOString()
    )
    .run();

  return id;
}

/**
 * Get all search configurations.
 */
export async function getSearchConfigs(
  env: StorageEnv
): Promise<SearchConfig[]> {
  const result = await env.DB.prepare(
    "SELECT * FROM search_configs ORDER BY name"
  ).all();
  return (result.results || []) as unknown as SearchConfig[];
}

/**
 * Create a new run entry.
 */
export async function createRun(
  env: StorageEnv,
  type: string,
  config_id?: string
): Promise<string> {
  const id = crypto.randomUUID();

  await env.DB.prepare(
    "INSERT INTO runs(id, type, config_id, status) VALUES(?1, ?2, ?3, ?4)"
  )
    .bind(id, type, config_id, "queued")
    .run();

  return id;
}

/**
 * Get recent runs.
 */
export async function getRuns(
  env: StorageEnv,
  limit: number = 20
): Promise<Run[]> {
  const result = await env.DB.prepare(
    "SELECT * FROM runs ORDER BY started_at DESC LIMIT ?1"
  )
    .bind(limit)
    .all();

  return (result.results || []) as unknown as Run[];
}

/**
 * Create a new snapshot with enhanced storage options.
 */
export async function createSnapshot(
  env: StorageEnv,
  snapshot: {
    job_id: string;
    run_id?: string;
    content_hash?: string;
    html_content?: string;
    json_content?: string;
    screenshot_data?: ArrayBuffer;
    pdf_data?: ArrayBuffer;
    markdown_content?: string;
    http_status?: number;
    etag?: string;
  }
): Promise<string> {
  const id = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  // Store content in R2 and get keys
  const r2Keys: {
    html_r2_key?: string;
    json_r2_key?: string;
    screenshot_r2_key?: string;
    pdf_r2_key?: string;
    markdown_r2_key?: string;
  } = {};

  if (snapshot.html_content) {
    const key = `snapshots/${snapshot.job_id}/${id}/page.html`;
    await env.R2.put(key, snapshot.html_content, {
      httpMetadata: { contentType: "text/html" },
    });
    r2Keys.html_r2_key = key;
  }

  if (snapshot.json_content) {
    const key = `snapshots/${snapshot.job_id}/${id}/data.json`;
    await env.R2.put(key, snapshot.json_content, {
      httpMetadata: { contentType: "application/json" },
    });
    r2Keys.json_r2_key = key;
  }

  if (snapshot.screenshot_data) {
    const key = `snapshots/${snapshot.job_id}/${id}/screenshot.png`;
    await env.R2.put(key, snapshot.screenshot_data, {
      httpMetadata: { contentType: "image/png" },
    });
    r2Keys.screenshot_r2_key = key;
  }

  if (snapshot.pdf_data) {
    const key = `snapshots/${snapshot.job_id}/${id}/render.pdf`;
    await env.R2.put(key, snapshot.pdf_data, {
      httpMetadata: { contentType: "application/pdf" },
    });
    r2Keys.pdf_r2_key = key;
  }

  if (snapshot.markdown_content) {
    const key = `snapshots/${snapshot.job_id}/${id}/extract.md`;
    await env.R2.put(key, snapshot.markdown_content, {
      httpMetadata: { contentType: "text/markdown" },
    });
    r2Keys.markdown_r2_key = key;
  }

  // Save snapshot record to database
  await env.DB.prepare(
    `INSERT INTO snapshots(
      id, job_id, run_id, content_hash, html_r2_key, json_r2_key,
      screenshot_r2_key, pdf_r2_key, markdown_r2_key, fetched_at, http_status, etag
    ) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12)`
  )
    .bind(
      id,
      snapshot.job_id,
      snapshot.run_id,
      snapshot.content_hash,
      r2Keys.html_r2_key,
      r2Keys.json_r2_key,
      r2Keys.screenshot_r2_key,
      r2Keys.pdf_r2_key,
      r2Keys.markdown_r2_key,
      timestamp,
      snapshot.http_status,
      snapshot.etag
    )
    .run();

  return id;
}
