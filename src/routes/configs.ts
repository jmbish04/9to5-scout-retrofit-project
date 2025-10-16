/**
 * Configurations API routes for managing search configurations.
 */

import { getSearchConfigs, saveSearchConfig } from '../lib/storage';
import type { SearchConfig } from '../lib/types';

export async function handleConfigsGet(request: Request, env: any): Promise<Response> {
  try {
    const configs = await getSearchConfigs(env);
    
    return new Response(JSON.stringify(configs), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching configs:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch configurations' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function handleConfigsPost(request: Request, env: any): Promise<Response> {
  try {
    const body = await request.json() as any;
    
    // Validate required fields
    if (!body.name || !body.keywords) {
      return new Response(JSON.stringify({ error: 'Name and keywords are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // Convert arrays to JSON strings for database storage
    const keywords = Array.isArray(body.keywords) ? JSON.stringify(body.keywords) : body.keywords;
    const locations = Array.isArray(body.locations) ? JSON.stringify(body.locations) : body.locations;
    const include_domains = Array.isArray(body.include_domains) ? JSON.stringify(body.include_domains) : body.include_domains;
    const exclude_domains = Array.isArray(body.exclude_domains) ? JSON.stringify(body.exclude_domains) : body.exclude_domains;
    
    const config: SearchConfig = {
      id: body.id || crypto.randomUUID(),
      name: body.name,
      keywords,
      locations,
      include_domains,
      exclude_domains,
      min_comp_total: body.min_comp_total,
    };
    
    const configId = await saveSearchConfig(env, config);
    
    return new Response(JSON.stringify({ id: configId }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error saving config:', error);
    return new Response(JSON.stringify({ error: 'Failed to save configuration' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}