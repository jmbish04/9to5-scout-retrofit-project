/**
 * Runs API routes for managing discovery and monitoring runs.
 */

import { createRun, getRuns } from '../lib/storage';

export async function handleRunsGet(request: Request, env: any): Promise<Response> {
  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '20');
    
    const runs = await getRuns(env, limit);
    
    return new Response(JSON.stringify(runs), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching runs:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch runs' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function handleDiscoveryRunPost(request: Request, env: any): Promise<Response> {
  try {
    const body = await request.json().catch(() => ({})) as { config_id?: string };
    const configId = body.config_id;
    
    const runId = await createRun(env, 'discovery', configId);
    
    // Trigger discovery workflow. This can be done asynchronously.
    env.DISCOVERY_WORKFLOW.run({ config_id: configId });
    
    return new Response(JSON.stringify({ id: runId, status: 'queued' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error creating discovery run:', error);
    return new Response(JSON.stringify({ error: 'Failed to create discovery run' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function handleMonitorRunPost(request: Request, env: any): Promise<Response> {
  try {
    const body = await request.json().catch(() => ({})) as { config_id?: string };
    const configId = body.config_id;
    
    const runId = await createRun(env, 'monitor', configId);
    
    // TODO: Trigger monitoring workflow
    console.log(`Monitor run ${runId} queued with config ${configId}`);
    
    return new Response(JSON.stringify({ id: runId, status: 'queued' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error creating monitor run:', error);
    return new Response(JSON.stringify({ error: 'Failed to create monitor run' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}