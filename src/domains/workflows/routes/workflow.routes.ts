/**
 * Workflow Routes
 *
 * RESTful API routes for workflow management, including creation,
 * execution, monitoring, and result retrieval.
 */

import { Hono } from "hono";
import { z } from "zod";
import type { Env } from "../../../config/env";
import {
  getValidatedBody,
  getValidatedParams,
  logger,
  rateLimit,
  validateBody,
  validateParams,
} from "../../../core/validation/hono-validation";
import {
  CreateWorkflowRequestSchema,
  UpdateWorkflowRequestSchema,
  WorkflowStepRequestSchema,
} from "../models/workflow.schema";
import { createWorkflowService } from "../services/workflow.service";
import { ChangeAnalysisWorkflow } from "../workflow-classes/change-analysis-workflow";
import { DiscoveryWorkflow } from "../workflow-classes/discovery-workflow";
import { JobMonitorWorkflow } from "../workflow-classes/job-monitor-workflow";

const app = new Hono<{ Bindings: Env }>();

// Apply middleware
app.use("*", logger());
app.use("*", rateLimit({ requests: 30, windowMs: 60000 }));

/**
 * @route POST /workflows
 * @desc Create a new workflow instance
 * @access Private
 * @param {CreateWorkflowRequest} body - Workflow configuration
 * @returns {WorkflowInstance} Created workflow instance
 */
app.post("/", validateBody(CreateWorkflowRequestSchema), async (c) => {
  try {
    const workflowData = getValidatedBody(c);
    const workflowService = createWorkflowService(c.env);

    const workflow = await workflowService.createWorkflow(workflowData);

    return c.json(
      {
        success: true,
        workflow,
      },
      201
    );
  } catch (error) {
    console.error("Error creating workflow:", error);
    return c.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to create workflow",
      },
      500
    );
  }
});

/**
 * @route GET /workflows
 * @desc List workflow instances with pagination
 * @access Private
 * @query {number} page - Page number
 * @query {number} limit - Items per page
 * @query {string} type - Filter by workflow type
 * @query {string} status - Filter by workflow status
 * @returns {WorkflowListResponse} List of workflow instances
 */
app.get("/", async (c) => {
  try {
    const page = parseInt(c.req.query("page") || "1");
    const limit = parseInt(c.req.query("limit") || "50");
    const type = c.req.query("type");
    const status = c.req.query("status");

    const workflowService = createWorkflowService(c.env);
    const result = await workflowService.listWorkflows(
      page,
      limit,
      type,
      status
    );

    return c.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Error listing workflows:", error);
    return c.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to list workflows",
      },
      500
    );
  }
});

/**
 * @route GET /workflows/:id
 * @desc Get a specific workflow instance
 * @access Private
 * @param {string} id - Workflow ID
 * @returns {WorkflowInstance} Workflow instance
 */
app.get(
  "/:id",
  validateParams(z.object({ id: z.string().min(1) })),
  async (c) => {
    try {
      const { id } = getValidatedParams(c) as { id: string };
      const workflowService = createWorkflowService(c.env);

      const workflow = await workflowService.getWorkflow(id);
      if (!workflow) {
        return c.json(
          {
            success: false,
            error: "Workflow not found",
          },
          404
        );
      }

      return c.json({
        success: true,
        workflow,
      });
    } catch (error) {
      console.error("Error getting workflow:", error);
      return c.json(
        {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to get workflow",
        },
        500
      );
    }
  }
);

/**
 * @route PUT /workflows/:id
 * @desc Update a workflow instance
 * @access Private
 * @param {string} id - Workflow ID
 * @param {UpdateWorkflowRequest} body - Update data
 * @returns {WorkflowInstance} Updated workflow instance
 */
app.put(
  "/:id",
  validateParams(z.object({ id: z.string().min(1) })),
  validateBody(UpdateWorkflowRequestSchema),
  async (c) => {
    try {
      const { id } = getValidatedParams(c) as { id: string };
      const updateData = getValidatedBody(c);
      const workflowService = createWorkflowService(c.env);

      const workflow = await workflowService.updateWorkflow(id, updateData);
      if (!workflow) {
        return c.json(
          {
            success: false,
            error: "Workflow not found",
          },
          404
        );
      }

      return c.json({
        success: true,
        workflow,
      });
    } catch (error) {
      console.error("Error updating workflow:", error);
      return c.json(
        {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to update workflow",
        },
        500
      );
    }
  }
);

/**
 * @route POST /workflows/:id/start
 * @desc Start a workflow execution
 * @access Private
 * @param {string} id - Workflow ID
 * @returns {WorkflowInstance} Started workflow instance
 */
app.post(
  "/:id/start",
  validateParams(z.object({ id: z.string().min(1) })),
  async (c) => {
    try {
      const { id } = getValidatedParams(c) as { id: string };
      const workflowService = createWorkflowService(c.env);

      const workflow = await workflowService.startWorkflow(id);
      if (!workflow) {
        return c.json(
          {
            success: false,
            error: "Workflow not found or cannot be started",
          },
          404
        );
      }

      return c.json({
        success: true,
        workflow,
      });
    } catch (error) {
      console.error("Error starting workflow:", error);
      return c.json(
        {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to start workflow",
        },
        500
      );
    }
  }
);

/**
 * @route POST /workflows/:id/complete
 * @desc Complete a workflow execution
 * @access Private
 * @param {string} id - Workflow ID
 * @param {WorkflowResult} body - Workflow result
 * @returns {WorkflowInstance} Completed workflow instance
 */
app.post(
  "/:id/complete",
  validateParams(z.object({ id: z.string().min(1) })),
  async (c) => {
    try {
      const { id } = getValidatedParams(c) as { id: string };
      const result = await c.req.json();
      const workflowService = createWorkflowService(c.env);

      const workflow = await workflowService.completeWorkflow(id, result);
      if (!workflow) {
        return c.json(
          {
            success: false,
            error: "Workflow not found",
          },
          404
        );
      }

      return c.json({
        success: true,
        workflow,
      });
    } catch (error) {
      console.error("Error completing workflow:", error);
      return c.json(
        {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to complete workflow",
        },
        500
      );
    }
  }
);

/**
 * @route POST /workflows/:id/fail
 * @desc Mark a workflow as failed
 * @access Private
 * @param {string} id - Workflow ID
 * @param {object} body - Error information
 * @returns {WorkflowInstance} Failed workflow instance
 */
app.post(
  "/:id/fail",
  validateParams(z.object({ id: z.string().min(1) })),
  async (c) => {
    try {
      const { id } = getValidatedParams(c) as { id: string };
      const { error } = await c.req.json();
      const workflowService = createWorkflowService(c.env);

      const workflow = await workflowService.failWorkflow(id, error);
      if (!workflow) {
        return c.json(
          {
            success: false,
            error: "Workflow not found",
          },
          404
        );
      }

      return c.json({
        success: true,
        workflow,
      });
    } catch (error) {
      console.error("Error failing workflow:", error);
      return c.json(
        {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to fail workflow",
        },
        500
      );
    }
  }
);

/**
 * @route POST /workflows/execute/discovery
 * @desc Execute a discovery workflow
 * @access Private
 * @param {DiscoveryWorkflowConfig} body - Discovery workflow configuration
 * @returns {WorkflowResult} Workflow execution result
 */
app.post("/execute/discovery", async (c) => {
  try {
    const config = await c.req.json();
    const discoveryWorkflow = new DiscoveryWorkflow(c.env);

    const result = await discoveryWorkflow.execute(config);

    return c.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("Error executing discovery workflow:", error);
    return c.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to execute discovery workflow",
      },
      500
    );
  }
});

/**
 * @route POST /workflows/execute/job-monitor
 * @desc Execute a job monitoring workflow
 * @access Private
 * @param {JobMonitorWorkflowConfig} body - Job monitoring workflow configuration
 * @returns {WorkflowResult} Workflow execution result
 */
app.post("/execute/job-monitor", async (c) => {
  try {
    const config = await c.req.json();
    const jobMonitorWorkflow = new JobMonitorWorkflow(c.env);

    const result = await jobMonitorWorkflow.execute(config);

    return c.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("Error executing job monitor workflow:", error);
    return c.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to execute job monitor workflow",
      },
      500
    );
  }
});

/**
 * @route POST /workflows/execute/change-analysis
 * @desc Execute a change analysis workflow
 * @access Private
 * @param {ChangeAnalysisWorkflowConfig} body - Change analysis workflow configuration
 * @returns {WorkflowResult} Workflow execution result
 */
app.post("/execute/change-analysis", async (c) => {
  try {
    const config = await c.req.json();
    const changeAnalysisWorkflow = new ChangeAnalysisWorkflow(c.env);

    const result = await changeAnalysisWorkflow.execute(config);

    return c.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("Error executing change analysis workflow:", error);
    return c.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to execute change analysis workflow",
      },
      500
    );
  }
});

/**
 * @route POST /workflows/steps/execute
 * @desc Execute a workflow step
 * @access Private
 * @param {WorkflowStepRequest} body - Step execution request
 * @returns {WorkflowStepResponse} Step execution result
 */
app.post(
  "/steps/execute",
  validateBody(WorkflowStepRequestSchema),
  async (c) => {
    try {
      const stepData = getValidatedBody(c);
      const workflowService = createWorkflowService(c.env);

      const result = await workflowService.executeStep(stepData);

      return c.json({
        success: true,
        ...result,
      });
    } catch (error) {
      console.error("Error executing workflow step:", error);
      return c.json(
        {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to execute workflow step",
        },
        500
      );
    }
  }
);

/**
 * @route POST /workflows/steps/:stepId/complete
 * @desc Complete a workflow step
 * @access Private
 * @param {string} stepId - Step ID
 * @param {object} body - Step result
 * @returns {object} Success message
 */
app.post(
  "/steps/:stepId/complete",
  validateParams(z.object({ stepId: z.string().min(1) })),
  async (c) => {
    try {
      const { stepId } = getValidatedParams(c) as { stepId: string };
      const { result, error } = await c.req.json();
      const workflowService = createWorkflowService(c.env);

      await workflowService.completeStep(stepId, result, error);

      return c.json({
        success: true,
        message: "Step completed successfully",
      });
    } catch (error) {
      console.error("Error completing workflow step:", error);
      return c.json(
        {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to complete workflow step",
        },
        500
      );
    }
  }
);

/**
 * @route GET /workflows/:id/logs
 * @desc Get workflow logs
 * @access Private
 * @param {string} id - Workflow ID
 * @query {string} stepId - Filter by step ID
 * @query {string} level - Filter by log level
 * @query {number} limit - Number of logs to return
 * @query {number} offset - Number of logs to skip
 * @returns {WorkflowLogResponse} Workflow logs
 */
app.get(
  "/:id/logs",
  validateParams(z.object({ id: z.string().min(1) })),
  async (c) => {
    try {
      const { id } = getValidatedParams(c) as { id: string };
      const stepId = c.req.query("stepId");
      const level = c.req.query("level") as
        | "debug"
        | "info"
        | "warn"
        | "error"
        | undefined;
      const limit = parseInt(c.req.query("limit") || "100");
      const offset = parseInt(c.req.query("offset") || "0");

      const workflowService = createWorkflowService(c.env);
      const result = await workflowService.getLogs({
        workflow_instance_id: id,
        step_id: stepId,
        level,
        limit,
        offset,
      });

      return c.json({
        success: true,
        ...result,
      });
    } catch (error) {
      console.error("Error getting workflow logs:", error);
      return c.json(
        {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to get workflow logs",
        },
        500
      );
    }
  }
);

/**
 * @route POST /workflows/:id/logs
 * @desc Add a workflow log entry
 * @access Private
 * @param {string} id - Workflow ID
 * @param {object} body - Log entry data
 * @returns {object} Success message
 */
app.post(
  "/:id/logs",
  validateParams(z.object({ id: z.string().min(1) })),
  async (c) => {
    try {
      const { id } = getValidatedParams(c) as { id: string };
      const { level, message, data, stepId } = await c.req.json();
      const workflowService = createWorkflowService(c.env);

      await workflowService.addLog(id, level, message, data, stepId);

      return c.json({
        success: true,
        message: "Log entry added successfully",
      });
    } catch (error) {
      console.error("Error adding workflow log:", error);
      return c.json(
        {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to add workflow log",
        },
        500
      );
    }
  }
);

/**
 * @route GET /workflows/stats
 * @desc Get workflow statistics
 * @access Private
 * @query {number} periodDays - Number of days to include in stats
 * @returns {WorkflowStatsResponse} Workflow statistics
 */
app.get("/stats", async (c) => {
  try {
    const periodDays = parseInt(c.req.query("periodDays") || "30");
    const workflowService = createWorkflowService(c.env);

    const result = await workflowService.getStats(periodDays);

    return c.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Error getting workflow stats:", error);
    return c.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get workflow stats",
      },
      500
    );
  }
});

/**
 * @route POST /workflows/cleanup
 * @desc Clean up old workflow data
 * @access Private
 * @param {object} body - Cleanup configuration
 * @returns {object} Success message
 */
app.post("/cleanup", async (c) => {
  try {
    const { olderThanDays = 30 } = await c.req.json();
    const workflowService = createWorkflowService(c.env);

    await workflowService.cleanupOldData(olderThanDays);

    return c.json({
      success: true,
      message: "Workflow data cleaned up successfully",
    });
  } catch (error) {
    console.error("Error cleaning up workflow data:", error);
    return c.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to clean up workflow data",
      },
      500
    );
  }
});

export default app;
