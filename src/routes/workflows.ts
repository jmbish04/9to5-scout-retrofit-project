/**
 * Workflow configuration management routes
 */

import type { Env } from '../lib/env';
import { createRun } from '../lib/storage';

export interface WorkflowConfig {
  id: string;
  name: string;
  description: string;
  task_sequence: string[]; // Array of task IDs in execution order
  enabled?: boolean;
  created_at?: string;
  updated_at?: string;
}

export async function handleWorkflowsGet(request: Request, env: any): Promise<Response> {
  try {
    const url = new URL(request.url);
    const enabled = url.searchParams.get('enabled');
    
    let sql = 'SELECT * FROM workflow_configs';
    const params: any[] = [];
    
    if (enabled !== null) {
      sql += ' WHERE enabled = ?';
      params.push(enabled === 'true' ? 1 : 0);
    }
    
    sql += ' ORDER BY created_at DESC';
    
    const { results } = await env.DB.prepare(sql).bind(...params).all();
    
    // Convert database results to proper types
    const workflows = results.map((row: any) => ({
      ...row,
      task_sequence: row.task_sequence ? JSON.parse(row.task_sequence) : [],
      enabled: Boolean(row.enabled)
    }));
    
    return new Response(JSON.stringify(workflows), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error listing workflows:', error);
    return new Response(JSON.stringify({ error: 'Failed to list workflows' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function handleWorkflowsPost(request: Request, env: any): Promise<Response> {
  try {
    const workflow: WorkflowConfig = await request.json();
    
    // Validate required fields
    if (!workflow.id || !workflow.name || !workflow.description || !workflow.task_sequence) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Validate that all tasks exist
    if (workflow.task_sequence.length > 0) {
      const { results: taskResults } = await env.DB.prepare(
        `SELECT id FROM task_configs WHERE id IN (${workflow.task_sequence.map(() => '?').join(',')})`
      ).bind(...workflow.task_sequence).all();
      
      if (taskResults.length !== workflow.task_sequence.length) {
        return new Response(JSON.stringify({ error: 'One or more tasks in sequence do not exist' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    const now = new Date().toISOString();
    
    await env.DB.prepare(`
      INSERT INTO workflow_configs (
        id, name, description, task_sequence, enabled, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      workflow.id,
      workflow.name,
      workflow.description,
      JSON.stringify(workflow.task_sequence),
      workflow.enabled !== false ? 1 : 0,
      now,
      now
    ).run();
    
    const createdWorkflow = {
      ...workflow,
      enabled: workflow.enabled !== false,
      created_at: now,
      updated_at: now
    };
    
    return new Response(JSON.stringify(createdWorkflow), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error creating workflow:', error);
    return new Response(JSON.stringify({ error: 'Failed to create workflow' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function handleWorkflowGet(request: Request, env: any, workflowId: string): Promise<Response> {
  try {
    const { results } = await env.DB.prepare(
      'SELECT * FROM workflow_configs WHERE id = ?'
    ).bind(workflowId).all();
    
    if (results.length === 0) {
      return new Response(JSON.stringify({ error: 'Workflow not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const workflow = results[0];
    const formattedWorkflow = {
      ...workflow,
      task_sequence: workflow.task_sequence ? JSON.parse(workflow.task_sequence) : [],
      enabled: Boolean(workflow.enabled)
    };
    
    return new Response(JSON.stringify(formattedWorkflow), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error getting workflow:', error);
    return new Response(JSON.stringify({ error: 'Failed to get workflow' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function handleWorkflowPut(request: Request, env: any, workflowId: string): Promise<Response> {
  try {
    const workflow: Partial<WorkflowConfig> = await request.json();
    const now = new Date().toISOString();
    
    // Check if workflow exists
    const { results } = await env.DB.prepare(
      'SELECT id FROM workflow_configs WHERE id = ?'
    ).bind(workflowId).all();
    
    if (results.length === 0) {
      return new Response(JSON.stringify({ error: 'Workflow not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Validate tasks if provided
    if (workflow.task_sequence && workflow.task_sequence.length > 0) {
      const { results: taskResults } = await env.DB.prepare(
        `SELECT id FROM task_configs WHERE id IN (${workflow.task_sequence.map(() => '?').join(',')})`
      ).bind(...workflow.task_sequence).all();
      
      if (taskResults.length !== workflow.task_sequence.length) {
        return new Response(JSON.stringify({ error: 'One or more tasks in sequence do not exist' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    await env.DB.prepare(`
      UPDATE workflow_configs SET 
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        task_sequence = COALESCE(?, task_sequence),
        enabled = COALESCE(?, enabled),
        updated_at = ?
      WHERE id = ?
    `).bind(
      workflow.name || null,
      workflow.description || null,
      workflow.task_sequence ? JSON.stringify(workflow.task_sequence) : null,
      workflow.enabled !== undefined ? (workflow.enabled ? 1 : 0) : null,
      now,
      workflowId
    ).run();
    
    // Fetch updated workflow
    const { results: updatedResults } = await env.DB.prepare(
      'SELECT * FROM workflow_configs WHERE id = ?'
    ).bind(workflowId).all();
    
    const updatedWorkflow = updatedResults[0];
    const formattedWorkflow = {
      ...updatedWorkflow,
      task_sequence: updatedWorkflow.task_sequence ? JSON.parse(updatedWorkflow.task_sequence) : [],
      enabled: Boolean(updatedWorkflow.enabled)
    };
    
    return new Response(JSON.stringify(formattedWorkflow), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error updating workflow:', error);
    return new Response(JSON.stringify({ error: 'Failed to update workflow' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function handleWorkflowDelete(request: Request, env: any, workflowId: string): Promise<Response> {
  try {
    // Check if workflow exists
    const { results } = await env.DB.prepare(
      'SELECT id FROM workflow_configs WHERE id = ?'
    ).bind(workflowId).all();
    
    if (results.length === 0) {
      return new Response(JSON.stringify({ error: 'Workflow not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    await env.DB.prepare('DELETE FROM workflow_configs WHERE id = ?').bind(workflowId).run();
    
    return new Response('', { status: 204 });
  } catch (error) {
    console.error('Error deleting workflow:', error);
    return new Response(JSON.stringify({ error: 'Failed to delete workflow' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

type WorkflowBindingKey = keyof Pick<Env, 'DISCOVERY_WORKFLOW' | 'JOB_MONITOR_WORKFLOW' | 'CHANGE_ANALYSIS_WORKFLOW'>;

function inferWorkflowBinding(workflowId: string, provided?: string | null): WorkflowBindingKey | null {
  if (provided) {
    const normalized = provided.toUpperCase();
    if (normalized in BINDING_NAME_MAP) {
      return BINDING_NAME_MAP[normalized as keyof typeof BINDING_NAME_MAP];
    }
  }

  const lowerId = workflowId.toLowerCase();
  if (lowerId.includes('discovery')) {
    return 'DISCOVERY_WORKFLOW';
  }
  if (lowerId.includes('monitor')) {
    return 'JOB_MONITOR_WORKFLOW';
  }
  if (lowerId.includes('change')) {
    return 'CHANGE_ANALYSIS_WORKFLOW';
  }

  return null;
}

const BINDING_NAME_MAP: Record<string, WorkflowBindingKey> = {
  DISCOVERY_WORKFLOW: 'DISCOVERY_WORKFLOW',
  DISCOVERY: 'DISCOVERY_WORKFLOW',
  JOB_MONITOR_WORKFLOW: 'JOB_MONITOR_WORKFLOW',
  JOB_MONITOR: 'JOB_MONITOR_WORKFLOW',
  MONITORING: 'JOB_MONITOR_WORKFLOW',
  CHANGE_ANALYSIS_WORKFLOW: 'CHANGE_ANALYSIS_WORKFLOW',
  CHANGE_ANALYSIS: 'CHANGE_ANALYSIS_WORKFLOW'
};

async function stageCustomWorkflowExecution(env: Env, workflow: any, taskSequence: string[], context: Record<string, unknown>) {
  const runId = await createRun(env, `workflow:${workflow.id}`, workflow.id);

  let orderedTasks: any[] = [];
  let missingTasks: string[] = [];
  if (taskSequence.length > 0) {
    const placeholders = taskSequence.map(() => '?').join(',');
    const { results: taskRows } = await env.DB.prepare(
      `SELECT * FROM task_configs WHERE id IN (${placeholders})`
    ).bind(...taskSequence).all();

    const taskMap = new Map<string, any>();
    for (const row of taskRows) {
      taskMap.set(row.id, row);
    }
    orderedTasks = taskSequence
      .map((id) => taskMap.get(id))
      .filter((task): task is any => Boolean(task));
    missingTasks = taskSequence.filter((id) => !taskMap.has(id));
  }

  const stats = {
    workflowId: workflow.id,
    workflowName: workflow.name,
    context,
    steps: orderedTasks.map((task) => ({
      id: task.id,
      name: task.name,
      agent: task.agent_id,
      description: task.description
    })),
    missingTasks
  };

  await env.DB.prepare(
    'UPDATE runs SET status = ?, stats_json = ? WHERE id = ?'
  ).bind('queued', JSON.stringify(stats), runId).run();

  return {
    runId,
    stats
  };
}

async function triggerBoundWorkflow(
  env: Env,
  binding: WorkflowBindingKey,
  workflowId: string,
  workflowName: string,
  taskSequence: string[],
  context: Record<string, unknown>,
  payload: any
) {
  const bindingRef: any = env[binding];
  if (!bindingRef || typeof bindingRef.create !== 'function') {
    throw new Error(`Workflow binding ${binding} is not available.`);
  }

  const runId = await createRun(env, `workflow:${workflowId}`, workflowId);
  const instance = await bindingRef.create({
    params: {
      workflowId,
      workflowName,
      taskSequence,
      context,
      payload
    }
  });

  const stats = {
    workflowId,
    workflowName,
    context,
    taskSequence,
    binding,
    instanceId: instance?.id ?? null
  };

  await env.DB.prepare(
    'UPDATE runs SET status = ?, stats_json = ? WHERE id = ?'
  ).bind('queued', JSON.stringify(stats), runId).run();

  return {
    runId,
    instanceId: instance?.id ?? null,
    stats
  };
}

export async function handleWorkflowExecute(request: Request, env: Env, workflowId: string): Promise<Response> {
  try {
    const { results } = await env.DB.prepare(
      'SELECT * FROM workflow_configs WHERE id = ? AND enabled = 1'
    ).bind(workflowId).all();

    if (results.length === 0) {
      return new Response(JSON.stringify({ error: 'Workflow not found or disabled' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const workflow = results[0];
    const taskSequence = Array.isArray(workflow.task_sequence)
      ? workflow.task_sequence
      : JSON.parse(workflow.task_sequence || '[]');

    const requestBody = await request.json().catch(() => ({}));
    const context = typeof requestBody.context === 'object' && requestBody.context !== null ? requestBody.context : {};
    const payload = requestBody.payload ?? null;
    const bindingOverride = typeof requestBody.binding === 'string' ? requestBody.binding : null;

    const inferredBinding = inferWorkflowBinding(workflowId, bindingOverride);

    if (inferredBinding) {
      const { runId, instanceId, stats } = await triggerBoundWorkflow(
        env,
        inferredBinding,
        workflowId,
        workflow.name,
        taskSequence,
        context,
        payload
      );

      const responsePayload = {
        execution_mode: 'cloudflare_workflow',
        workflow_id: workflowId,
        workflow_name: workflow.name,
        task_sequence: taskSequence,
        status: 'queued',
        context,
        binding: inferredBinding,
        run_id: runId,
        workflow_instance_id: instanceId,
        stats,
        accepted_at: new Date().toISOString()
      };

      return new Response(JSON.stringify(responsePayload), {
        status: 202,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { runId, stats } = await stageCustomWorkflowExecution(env, workflow, taskSequence, context);

    const responsePayload = {
      execution_mode: 'staged',
      workflow_id: workflowId,
      workflow_name: workflow.name,
      task_sequence: taskSequence,
      status: 'queued',
      context,
      run_id: runId,
      stats,
      message: 'Workflow has been staged for custom orchestration. Monitor run records for progress updates.'
    };

    return new Response(JSON.stringify(responsePayload), {
      status: 202,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error executing workflow:', error);
    return new Response(JSON.stringify({ error: 'Failed to execute workflow' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}