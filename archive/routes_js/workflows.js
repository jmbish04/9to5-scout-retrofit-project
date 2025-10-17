/**
 * Workflow configuration management routes
 */
export async function handleWorkflowsGet(request, env) {
    try {
        const url = new URL(request.url);
        const enabled = url.searchParams.get("enabled");
        let sql = "SELECT * FROM workflow_configs";
        const params = [];
        if (enabled !== null) {
            sql += " WHERE enabled = ?";
            params.push(enabled === "true" ? 1 : 0);
        }
        sql += " ORDER BY created_at DESC";
        const { results } = await env.DB.prepare(sql)
            .bind(...params)
            .all();
        // Convert database results to proper types
        const workflows = results.map((row) => ({
            ...row,
            task_sequence: row.task_sequence
                ? JSON.parse(row.task_sequence)
                : [],
            enabled: Boolean(row.enabled),
        }));
        return new Response(JSON.stringify(workflows), {
            headers: { "Content-Type": "application/json" },
        });
    }
    catch (error) {
        console.error("Error listing workflows:", error);
        return new Response(JSON.stringify({ error: "Failed to list workflows" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
export async function handleWorkflowsPost(request, env) {
    try {
        const workflow = await request.json();
        // Validate required fields
        if (!workflow.id ||
            !workflow.name ||
            !workflow.description ||
            !workflow.task_sequence) {
            return new Response(JSON.stringify({ error: "Missing required fields" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }
        // Validate that all tasks exist
        if (workflow.task_sequence.length > 0) {
            const { results: taskResults } = await env.DB.prepare(`SELECT id FROM task_configs WHERE id IN (${workflow.task_sequence
                .map(() => "?")
                .join(",")})`)
                .bind(...workflow.task_sequence)
                .all();
            if (taskResults.length !== workflow.task_sequence.length) {
                return new Response(JSON.stringify({
                    error: "One or more tasks in sequence do not exist",
                }), {
                    status: 400,
                    headers: { "Content-Type": "application/json" },
                });
            }
        }
        const now = new Date().toISOString();
        await env.DB.prepare(`
      INSERT INTO workflow_configs (
        id, name, description, task_sequence, enabled, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
            .bind(workflow.id, workflow.name, workflow.description, JSON.stringify(workflow.task_sequence), workflow.enabled !== false ? 1 : 0, now, now)
            .run();
        const createdWorkflow = {
            ...workflow,
            enabled: workflow.enabled !== false,
            created_at: now,
            updated_at: now,
        };
        return new Response(JSON.stringify(createdWorkflow), {
            status: 201,
            headers: { "Content-Type": "application/json" },
        });
    }
    catch (error) {
        console.error("Error creating workflow:", error);
        return new Response(JSON.stringify({ error: "Failed to create workflow" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
export async function handleWorkflowGet(request, env, workflowId) {
    try {
        const { results } = await env.DB.prepare("SELECT * FROM workflow_configs WHERE id = ?")
            .bind(workflowId)
            .all();
        if (results.length === 0) {
            return new Response(JSON.stringify({ error: "Workflow not found" }), {
                status: 404,
                headers: { "Content-Type": "application/json" },
            });
        }
        const workflow = results[0];
        if (!workflow) {
            return new Response(JSON.stringify({ error: "Workflow not found" }), {
                status: 404,
                headers: { "Content-Type": "application/json" },
            });
        }
        const formattedWorkflow = {
            ...workflow,
            task_sequence: workflow.task_sequence
                ? JSON.parse(workflow.task_sequence)
                : [],
            enabled: Boolean(workflow.enabled),
        };
        return new Response(JSON.stringify(formattedWorkflow), {
            headers: { "Content-Type": "application/json" },
        });
    }
    catch (error) {
        console.error("Error getting workflow:", error);
        return new Response(JSON.stringify({ error: "Failed to get workflow" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
export async function handleWorkflowPut(request, env, workflowId) {
    try {
        const workflow = await request.json();
        const now = new Date().toISOString();
        // Check if workflow exists
        const { results } = await env.DB.prepare("SELECT id FROM workflow_configs WHERE id = ?")
            .bind(workflowId)
            .all();
        if (results.length === 0) {
            return new Response(JSON.stringify({ error: "Workflow not found" }), {
                status: 404,
                headers: { "Content-Type": "application/json" },
            });
        }
        // Validate tasks if provided
        if (workflow.task_sequence && workflow.task_sequence.length > 0) {
            const { results: taskResults } = await env.DB.prepare(`SELECT id FROM task_configs WHERE id IN (${workflow.task_sequence
                .map(() => "?")
                .join(",")})`)
                .bind(...workflow.task_sequence)
                .all();
            if (taskResults.length !== workflow.task_sequence.length) {
                return new Response(JSON.stringify({
                    error: "One or more tasks in sequence do not exist",
                }), {
                    status: 400,
                    headers: { "Content-Type": "application/json" },
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
    `)
            .bind(workflow.name || null, workflow.description || null, workflow.task_sequence ? JSON.stringify(workflow.task_sequence) : null, workflow.enabled !== undefined ? (workflow.enabled ? 1 : 0) : null, now, workflowId)
            .run();
        // Fetch updated workflow
        const { results: updatedResults } = await env.DB.prepare("SELECT * FROM workflow_configs WHERE id = ?")
            .bind(workflowId)
            .all();
        const updatedWorkflow = updatedResults[0];
        if (!updatedWorkflow) {
            return new Response(JSON.stringify({ error: "Workflow not found" }), {
                status: 404,
                headers: { "Content-Type": "application/json" },
            });
        }
        const formattedWorkflow = {
            ...updatedWorkflow,
            task_sequence: updatedWorkflow.task_sequence
                ? JSON.parse(updatedWorkflow.task_sequence)
                : [],
            enabled: Boolean(updatedWorkflow.enabled),
        };
        return new Response(JSON.stringify(formattedWorkflow), {
            headers: { "Content-Type": "application/json" },
        });
    }
    catch (error) {
        console.error("Error updating workflow:", error);
        return new Response(JSON.stringify({ error: "Failed to update workflow" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
export async function handleWorkflowDelete(request, env, workflowId) {
    try {
        // Check if workflow exists
        const { results } = await env.DB.prepare("SELECT id FROM workflow_configs WHERE id = ?")
            .bind(workflowId)
            .all();
        if (results.length === 0) {
            return new Response(JSON.stringify({ error: "Workflow not found" }), {
                status: 404,
                headers: { "Content-Type": "application/json" },
            });
        }
        await env.DB.prepare("DELETE FROM workflow_configs WHERE id = ?")
            .bind(workflowId)
            .run();
        return new Response("", { status: 204 });
    }
    catch (error) {
        console.error("Error deleting workflow:", error);
        return new Response(JSON.stringify({ error: "Failed to delete workflow" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
export async function handleWorkflowExecute(request, env, workflowId) {
    try {
        // Get workflow configuration
        const { results } = await env.DB.prepare("SELECT * FROM workflow_configs WHERE id = ? AND enabled = 1")
            .bind(workflowId)
            .all();
        if (results.length === 0) {
            return new Response(JSON.stringify({ error: "Workflow not found or disabled" }), {
                status: 404,
                headers: { "Content-Type": "application/json" },
            });
        }
        const workflow = results[0];
        if (!workflow) {
            return new Response(JSON.stringify({ error: "Workflow not found or disabled" }), {
                status: 404,
                headers: { "Content-Type": "application/json" },
            });
        }
        const taskSequence = JSON.parse(workflow.task_sequence);
        // Parse request body for context
        const requestBody = (await request.json().catch(() => ({})));
        const context = requestBody.context || {};
        // Generate unique execution ID
        const executionId = `exec_${Date.now()}_${Math.random()
            .toString(36)
            .substr(2, 9)}`;
        // For now, return a placeholder response indicating the workflow would be executed
        // In a full implementation, this would trigger a Cloudflare Workflow or similar orchestration
        const response = {
            execution_id: executionId,
            workflow_id: workflowId,
            workflow_name: workflow.name,
            task_sequence: taskSequence,
            status: "queued",
            context: context,
            started_at: new Date().toISOString(),
            message: "Workflow execution queued. This is a placeholder - full workflow orchestration would be implemented using Cloudflare Workflows.",
        };
        return new Response(JSON.stringify(response), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    }
    catch (error) {
        console.error("Error executing workflow:", error);
        return new Response(JSON.stringify({ error: "Failed to execute workflow" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
