/**
 * Configuration Routes
 */

import { ConfigService } from '../services/config.service';
import type { Env } from '../env/env.config';

export async function handleConfigsGet(request: Request, env: Env): Promise<Response> {
  const service = new ConfigService(env);
  try {
    const configs = await service.getSearchConfigs();
    return new Response(JSON.stringify(configs), { headers: { "Content-Type": "application/json" } });
  } catch (error) {
    // The global error handler will catch and format this
    throw error;
  }
}

export async function handleConfigsPost(request: Request, env: Env): Promise<Response> {
  const service = new ConfigService(env);
  try {
    const body = await request.json();
    const configId = await service.saveSearchConfig(body as any);
    return new Response(JSON.stringify({ id: configId }), { headers: { "Content-Type": "application/json" } });
  } catch (error) {
    throw error;
  }
}

export async function handleConfigsDelete(request: Request, env: Env): Promise<Response> {
  const service = new ConfigService(env);
  const configId = new URL(request.url).pathname.split("/").pop();
  if (!configId) {
    return new Response(JSON.stringify({ error: "Configuration ID is required" }), { status: 400 });
  }
  try {
    await service.deleteSearchConfig(configId);
    return new Response(JSON.stringify({ success: true, message: "Configuration deleted" }), { headers: { "Content-Type": "application/json" } });
  } catch (error) {
    throw error;
  }
}

export async function handleConfigsGetById(request: Request, env: Env): Promise<Response> {
  const service = new ConfigService(env);
  const configId = new URL(request.url).pathname.split("/").pop();
  if (!configId) {
    return new Response(JSON.stringify({ error: "Configuration ID is required" }), { status: 400 });
  }
  try {
    const config = await service.getSearchConfigById(configId);
    return new Response(JSON.stringify(config), { headers: { "Content-Type": "application/json" } });
  } catch (error) {
    throw error;
  }
}