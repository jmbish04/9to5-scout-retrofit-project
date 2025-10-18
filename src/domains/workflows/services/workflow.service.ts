/**
 * Workflow Service
 *
 * Service for managing workflow instances, executions, and monitoring.
 * Handles workflow lifecycle, step execution, and result tracking.
 */

import type { Env } from "../../../config/env";
import type {
  CreateWorkflowRequest,
  UpdateWorkflowRequest,
  WorkflowExecution,
  WorkflowInstance,
  WorkflowListResponse,
  WorkflowLogRequest,
  WorkflowLogResponse,
  WorkflowResult,
  WorkflowStats,
  WorkflowStatsResponse,
  WorkflowStep,
  WorkflowType,
  WorkflowStatus,
  WorkflowStepRequest,
  WorkflowStepResponse,
  WorkflowTypeStats,
} from "../types/workflow.types";

export class WorkflowService {
  constructor(private env: Env) {}

  /**
   * Create a new workflow instance
   */
  async createWorkflow(
    request: CreateWorkflowRequest
  ): Promise<WorkflowInstance> {
    const workflowId = crypto.randomUUID();
    const now = new Date().toISOString();

    const workflow: WorkflowInstance = {
      id: workflowId,
      type: request.type,
      status: "pending",
      site_id: request.site_id,
      job_id: request.job_id,
      config: request.config,
      progress: 0,
      started_at: now,
      created_at: now,
      updated_at: now,
    };

    await this.env.DB.prepare(
      `
      INSERT INTO workflow_instances (
        id, type, status, site_id, job_id, config, progress, 
        started_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    )
      .bind(
        workflow.id,
        workflow.type,
        workflow.status,
        workflow.site_id,
        workflow.job_id,
        JSON.stringify(workflow.config),
        workflow.progress,
        workflow.started_at,
        workflow.created_at,
        workflow.updated_at
      )
      .run();

    return workflow;
  }

  /**
   * Get a workflow instance by ID
   */
  async getWorkflow(workflowId: string): Promise<WorkflowInstance | null> {
    const result = await this.env.DB.prepare(
      `
      SELECT * FROM workflow_instances WHERE id = ?
    `
    )
      .bind(workflowId)
      .first();

    if (!result) {
      return null;
    }

    return {
      id: result.id as string,
      type: result.type as WorkflowType,
      status: result.status as WorkflowStatus,
      site_id: result.site_id as string | undefined,
      job_id: result.job_id as string | undefined,
      config: JSON.parse(result.config as string),
      current_step: result.current_step as string | undefined,
      progress: result.progress as number,
      started_at: result.started_at as string,
      completed_at: result.completed_at as string | undefined,
      error: result.error as string | undefined,
      result: result.result ? JSON.parse(result.result as string) : undefined,
      created_at: result.created_at as string,
      updated_at: result.updated_at as string,
    };
  }

  /**
   * Update a workflow instance
   */
  async updateWorkflow(
    workflowId: string,
    updates: UpdateWorkflowRequest
  ): Promise<WorkflowInstance | null> {
    const workflow = await this.getWorkflow(workflowId);
    if (!workflow) {
      return null;
    }

    const updatedWorkflow = {
      ...workflow,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    await this.env.DB.prepare(
      `
      UPDATE workflow_instances 
      SET status = ?, config = ?, current_step = ?, progress = ?, 
          error = ?, result = ?, updated_at = ?
      WHERE id = ?
    `
    )
      .bind(
        updatedWorkflow.status,
        JSON.stringify(updatedWorkflow.config),
        updatedWorkflow.current_step,
        updatedWorkflow.progress,
        updatedWorkflow.error,
        updatedWorkflow.result ? JSON.stringify(updatedWorkflow.result) : null,
        updatedWorkflow.updated_at,
        workflowId
      )
      .run();

    return updatedWorkflow;
  }

  /**
   * List workflow instances with pagination
   */
  async listWorkflows(
    page: number = 1,
    limit: number = 50,
    type?: string,
    status?: string
  ): Promise<WorkflowListResponse> {
    const offset = (page - 1) * limit;
    let whereClause = "WHERE 1=1";
    const params: any[] = [];

    if (type) {
      whereClause += " AND type = ?";
      params.push(type);
    }

    if (status) {
      whereClause += " AND status = ?";
      params.push(status);
    }

    // Get total count
    const countResult = await this.env.DB.prepare(
      `
      SELECT COUNT(*) as total FROM workflow_instances ${whereClause}
    `
    )
      .bind(...params)
      .first();

    const total = (countResult as { total: number }).total;

    // Get workflows
    const workflows = await this.env.DB.prepare(
      `
      SELECT * FROM workflow_instances 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `
    )
      .bind(...params, limit, offset)
      .all();

    const workflowInstances = (workflows || []).map((w: any) => ({
      id: w.id,
      type: w.type,
      status: w.status,
      site_id: w.site_id,
      job_id: w.job_id,
      config: JSON.parse(w.config),
      current_step: w.current_step,
      progress: w.progress,
      started_at: w.started_at,
      completed_at: w.completed_at,
      error: w.error,
      result: w.result ? JSON.parse(w.result) : undefined,
      created_at: w.created_at,
      updated_at: w.updated_at,
    }));

    return {
      workflows: workflowInstances,
      total,
      page,
      limit,
      has_more: offset + limit < total,
    };
  }

  /**
   * Start a workflow execution
   */
  async startWorkflow(workflowId: string): Promise<WorkflowInstance | null> {
    const workflow = await this.getWorkflow(workflowId);
    if (!workflow || workflow.status !== "pending") {
      return null;
    }

    return await this.updateWorkflow(workflowId, {
      status: "running",
      started_at: new Date().toISOString(),
    });
  }

  /**
   * Complete a workflow execution
   */
  async completeWorkflow(
    workflowId: string,
    result: WorkflowResult
  ): Promise<WorkflowInstance | null> {
    return await this.updateWorkflow(workflowId, {
      status: "completed",
      completed_at: new Date().toISOString(),
      result,
      progress: 100,
    });
  }

  /**
   * Fail a workflow execution
   */
  async failWorkflow(
    workflowId: string,
    error: string
  ): Promise<WorkflowInstance | null> {
    return await this.updateWorkflow(workflowId, {
      status: "failed",
      completed_at: new Date().toISOString(),
      error,
    });
  }

  /**
   * Execute a workflow step
   */
  async executeStep(
    request: WorkflowStepRequest
  ): Promise<WorkflowStepResponse> {
    const stepId = crypto.randomUUID();
    const now = new Date().toISOString();

    const step: WorkflowStep = {
      id: stepId,
      name: request.step_name,
      status: "running",
      started_at: now,
      retry_count: 0,
      max_retries: 3,
    };

    const execution: WorkflowExecution = {
      id: crypto.randomUUID(),
      workflow_instance_id: request.workflow_instance_id,
      step_id: stepId,
      status: "running",
      started_at: now,
      retry_count: 0,
    };

    // Store step and execution
    await this.env.DB.prepare(
      `
      INSERT INTO workflow_steps (id, workflow_instance_id, name, status, started_at, retry_count, max_retries)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `
    )
      .bind(
        step.id,
        request.workflow_instance_id,
        step.name,
        step.status,
        step.started_at,
        step.retry_count,
        step.max_retries
      )
      .run();

    await this.env.DB.prepare(
      `
      INSERT INTO workflow_executions (id, workflow_instance_id, step_id, status, started_at, retry_count)
      VALUES (?, ?, ?, ?, ?, ?)
    `
    )
      .bind(
        execution.id,
        execution.workflow_instance_id,
        execution.step_id,
        execution.status,
        execution.started_at,
        execution.retry_count
      )
      .run();

    return {
      step,
      execution,
    };
  }

  /**
   * Complete a workflow step
   */
  async completeStep(
    stepId: string,
    result: Record<string, unknown>,
    error?: string
  ): Promise<void> {
    const now = new Date().toISOString();
    const status = error ? "failed" : "completed";

    await this.env.DB.prepare(
      `
      UPDATE workflow_steps 
      SET status = ?, completed_at = ?, error = ?, result = ?
      WHERE id = ?
    `
    )
      .bind(
        status,
        now,
        error || null,
        result ? JSON.stringify(result) : null,
        stepId
      )
      .run();

    await this.env.DB.prepare(
      `
      UPDATE workflow_executions 
      SET status = ?, completed_at = ?, error = ?, result = ?
      WHERE step_id = ?
    `
    )
      .bind(
        status,
        now,
        error || null,
        result ? JSON.stringify(result) : null,
        stepId
      )
      .run();
  }

  /**
   * Add a workflow log entry
   */
  async addLog(
    workflowInstanceId: string,
    level: "debug" | "info" | "warn" | "error",
    message: string,
    data?: Record<string, unknown>,
    stepId?: string
  ): Promise<void> {
    const logId = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.env.DB.prepare(
      `
      INSERT INTO workflow_logs (id, workflow_instance_id, step_id, level, message, data, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `
    )
      .bind(
        logId,
        workflowInstanceId,
        stepId || null,
        level,
        message,
        data ? JSON.stringify(data) : null,
        now
      )
      .run();
  }

  /**
   * Get workflow logs
   */
  async getLogs(request: WorkflowLogRequest): Promise<WorkflowLogResponse> {
    const limit = request.limit || 100;
    const offset = request.offset || 0;

    let whereClause = "WHERE workflow_instance_id = ?";
    const params: any[] = [request.workflow_instance_id];

    if (request.step_id) {
      whereClause += " AND step_id = ?";
      params.push(request.step_id);
    }

    if (request.level) {
      whereClause += " AND level = ?";
      params.push(request.level);
    }

    // Get total count
    const countResult = await this.env.DB.prepare(
      `
      SELECT COUNT(*) as total FROM workflow_logs ${whereClause}
    `
    )
      .bind(...params)
      .first();

    const total = (countResult as { total: number }).total;

    // Get logs
    const logs = await this.env.DB.prepare(
      `
      SELECT * FROM workflow_logs 
      ${whereClause}
      ORDER BY timestamp DESC
      LIMIT ? OFFSET ?
    `
    )
      .bind(...params, limit, offset)
      .all();

    const workflowLogs = (logs || []).map((log: any) => ({
      id: log.id,
      workflow_instance_id: log.workflow_instance_id,
      step_id: log.step_id,
      level: log.level,
      message: log.message,
      data: log.data ? JSON.parse(log.data) : undefined,
      timestamp: log.timestamp,
    }));

    return {
      logs: workflowLogs,
      total,
      has_more: offset + limit < total,
    };
  }

  /**
   * Get workflow statistics
   */
  async getStats(periodDays: number = 30): Promise<WorkflowStatsResponse> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);
    const endDate = new Date();

    // Get overall stats
    const overallStats = await this.env.DB.prepare(
      `
      SELECT 
        COUNT(*) as total_workflows,
        SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) as running_workflows,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_workflows,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_workflows,
        AVG(CASE WHEN completed_at IS NOT NULL THEN 
          (julianday(completed_at) - julianday(started_at)) * 24 * 60 * 60 * 1000 
        END) as average_duration_ms
      FROM workflow_instances 
      WHERE created_at >= ? AND created_at <= ?
    `
    )
      .bind(startDate.toISOString(), endDate.toISOString())
      .first();

    const stats = overallStats as {
      total_workflows: number;
      running_workflows: number;
      completed_workflows: number;
      failed_workflows: number;
      average_duration_ms: number;
    };

    const successRate =
      stats.total_workflows > 0
        ? (stats.completed_workflows / stats.total_workflows) * 100
        : 0;
    const errorRate =
      stats.total_workflows > 0
        ? (stats.failed_workflows / stats.total_workflows) * 100
        : 0;

    // Get stats by type
    const typeStats = await this.env.DB.prepare(
      `
      SELECT 
        type,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) as running,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        AVG(CASE WHEN completed_at IS NOT NULL THEN 
          (julianday(completed_at) - julianday(started_at)) * 24 * 60 * 60 * 1000 
        END) as average_duration_ms
      FROM workflow_instances 
      WHERE created_at >= ? AND created_at <= ?
      GROUP BY type
    `
    )
      .bind(startDate.toISOString(), endDate.toISOString())
      .all();

    const byType: Record<string, WorkflowTypeStats> = {};
    (typeStats || []).forEach((typeStat: any) => {
      const typeSuccessRate =
        typeStat.total > 0 ? (typeStat.completed / typeStat.total) * 100 : 0;

      byType[typeStat.type] = {
        total: typeStat.total,
        running: typeStat.running,
        completed: typeStat.completed,
        failed: typeStat.failed,
        average_duration_ms: typeStat.average_duration_ms || 0,
        success_rate_percentage: typeSuccessRate,
      };
    });

    const workflowStats: WorkflowStats = {
      total_workflows: stats.total_workflows,
      running_workflows: stats.running_workflows,
      completed_workflows: stats.completed_workflows,
      failed_workflows: stats.failed_workflows,
      average_duration_ms: stats.average_duration_ms || 0,
      success_rate_percentage: successRate,
      error_rate_percentage: errorRate,
      by_type: byType,
    };

    return {
      stats: workflowStats,
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
    };
  }

  /**
   * Clean up old workflow data
   */
  async cleanupOldData(olderThanDays: number = 30): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    // Delete old completed/failed workflows
    await this.env.DB.prepare(
      `
      DELETE FROM workflow_instances 
      WHERE status IN ('completed', 'failed') 
      AND completed_at < ?
    `
    )
      .bind(cutoffDate.toISOString())
      .run();

    // Delete old logs
    await this.env.DB.prepare(
      `
      DELETE FROM workflow_logs 
      WHERE timestamp < ?
    `
    )
      .bind(cutoffDate.toISOString())
      .run();
  }
}

/**
 * Factory function to create a WorkflowService instance
 */
export function createWorkflowService(env: Env): WorkflowService {
  return new WorkflowService(env);
}
