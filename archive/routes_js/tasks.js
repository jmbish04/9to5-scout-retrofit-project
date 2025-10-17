/**
 * Task configuration management routes
 */
export async function handleTasksGet(request, env) {
    try {
        const url = new URL(request.url);
        const enabled = url.searchParams.get("enabled");
        const agentId = url.searchParams.get("agent_id");
        let sql = `
      SELECT t.*, a.name as agent_name 
      FROM task_configs t 
      LEFT JOIN agent_configs a ON t.agent_id = a.id
    `;
        const params = [];
        const conditions = [];
        if (enabled !== null) {
            conditions.push("t.enabled = ?");
            params.push(enabled === "true" ? 1 : 0);
        }
        if (agentId) {
            conditions.push("t.agent_id = ?");
            params.push(agentId);
        }
        if (conditions.length > 0) {
            sql += " WHERE " + conditions.join(" AND ");
        }
        sql += " ORDER BY t.created_at DESC";
        const { results } = await env.DB.prepare(sql)
            .bind(...params)
            .all();
        // Convert database results to proper types
        const tasks = results.map((row) => ({
            ...row,
            context_tasks: row.context_tasks
                ? JSON.parse(row.context_tasks)
                : null,
            output_schema: row.output_schema
                ? JSON.parse(row.output_schema)
                : null,
            enabled: Boolean(row.enabled),
        }));
        return new Response(JSON.stringify(tasks), {
            headers: { "Content-Type": "application/json" },
        });
    }
    catch (error) {
        console.error("Error listing tasks:", error);
        return new Response(JSON.stringify({ error: "Failed to list tasks" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
export async function handleTasksPost(request, env) {
    try {
        const task = await request.json();
        // Validate required fields
        if (!task.id ||
            !task.name ||
            !task.description ||
            !task.expected_output ||
            !task.agent_id) {
            return new Response(JSON.stringify({ error: "Missing required fields" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }
        // Validate that agent exists
        const { results: agentResults } = await env.DB.prepare("SELECT id FROM agent_configs WHERE id = ?")
            .bind(task.agent_id)
            .all();
        if (agentResults.length === 0) {
            return new Response(JSON.stringify({ error: "Referenced agent does not exist" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }
        // Validate context tasks if provided
        if (task.context_tasks && task.context_tasks.length > 0) {
            const { results: contextResults } = await env.DB.prepare(`SELECT id FROM task_configs WHERE id IN (${task.context_tasks
                .map(() => "?")
                .join(",")})`)
                .bind(...task.context_tasks)
                .all();
            if (contextResults.length !== task.context_tasks.length) {
                return new Response(JSON.stringify({ error: "One or more context tasks do not exist" }), {
                    status: 400,
                    headers: { "Content-Type": "application/json" },
                });
            }
        }
        const now = new Date().toISOString();
        await env.DB.prepare(`
      INSERT INTO task_configs (
        id, name, description, expected_output, agent_id, context_tasks, 
        output_schema, enabled, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
            .bind(task.id, task.name, task.description, task.expected_output, task.agent_id, task.context_tasks ? JSON.stringify(task.context_tasks) : null, task.output_schema ? JSON.stringify(task.output_schema) : null, task.enabled !== false ? 1 : 0, now, now)
            .run();
        const createdTask = {
            ...task,
            enabled: task.enabled !== false,
            created_at: now,
            updated_at: now,
        };
        return new Response(JSON.stringify(createdTask), {
            status: 201,
            headers: { "Content-Type": "application/json" },
        });
    }
    catch (error) {
        console.error("Error creating task:", error);
        return new Response(JSON.stringify({ error: "Failed to create task" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
export async function handleTaskGet(request, env, taskId) {
    try {
        const { results } = await env.DB.prepare(`
      SELECT t.*, a.name as agent_name 
      FROM task_configs t 
      LEFT JOIN agent_configs a ON t.agent_id = a.id
      WHERE t.id = ?
    `)
            .bind(taskId)
            .all();
        if (results.length === 0) {
            return new Response(JSON.stringify({ error: "Task not found" }), {
                status: 404,
                headers: { "Content-Type": "application/json" },
            });
        }
        const task = results[0];
        if (!task) {
            return new Response(JSON.stringify({ error: "Task not found" }), {
                status: 404,
                headers: { "Content-Type": "application/json" },
            });
        }
        const formattedTask = {
            ...task,
            context_tasks: task.context_tasks
                ? JSON.parse(task.context_tasks)
                : null,
            output_schema: task.output_schema
                ? JSON.parse(task.output_schema)
                : null,
            enabled: Boolean(task.enabled),
        };
        return new Response(JSON.stringify(formattedTask), {
            headers: { "Content-Type": "application/json" },
        });
    }
    catch (error) {
        console.error("Error getting task:", error);
        return new Response(JSON.stringify({ error: "Failed to get task" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
export async function handleTaskPut(request, env, taskId) {
    try {
        const task = await request.json();
        const now = new Date().toISOString();
        // Check if task exists
        const { results } = await env.DB.prepare("SELECT id FROM task_configs WHERE id = ?")
            .bind(taskId)
            .all();
        if (results.length === 0) {
            return new Response(JSON.stringify({ error: "Task not found" }), {
                status: 404,
                headers: { "Content-Type": "application/json" },
            });
        }
        // Validate agent exists if provided
        if (task.agent_id) {
            const { results: agentResults } = await env.DB.prepare("SELECT id FROM agent_configs WHERE id = ?")
                .bind(task.agent_id)
                .all();
            if (agentResults.length === 0) {
                return new Response(JSON.stringify({ error: "Referenced agent does not exist" }), {
                    status: 400,
                    headers: { "Content-Type": "application/json" },
                });
            }
        }
        // Validate context tasks if provided
        if (task.context_tasks && task.context_tasks.length > 0) {
            const { results: contextResults } = await env.DB.prepare(`SELECT id FROM task_configs WHERE id IN (${task.context_tasks
                .map(() => "?")
                .join(",")})`)
                .bind(...task.context_tasks)
                .all();
            if (contextResults.length !== task.context_tasks.length) {
                return new Response(JSON.stringify({ error: "One or more context tasks do not exist" }), {
                    status: 400,
                    headers: { "Content-Type": "application/json" },
                });
            }
        }
        await env.DB.prepare(`
      UPDATE task_configs SET 
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        expected_output = COALESCE(?, expected_output),
        agent_id = COALESCE(?, agent_id),
        context_tasks = COALESCE(?, context_tasks),
        output_schema = COALESCE(?, output_schema),
        enabled = COALESCE(?, enabled),
        updated_at = ?
      WHERE id = ?
    `)
            .bind(task.name || null, task.description || null, task.expected_output || null, task.agent_id || null, task.context_tasks ? JSON.stringify(task.context_tasks) : null, task.output_schema ? JSON.stringify(task.output_schema) : null, task.enabled !== undefined ? (task.enabled ? 1 : 0) : null, now, taskId)
            .run();
        // Fetch updated task
        const { results: updatedResults } = await env.DB.prepare(`
      SELECT t.*, a.name as agent_name 
      FROM task_configs t 
      LEFT JOIN agent_configs a ON t.agent_id = a.id
      WHERE t.id = ?
    `)
            .bind(taskId)
            .all();
        const updatedTask = updatedResults[0];
        if (!updatedTask) {
            return new Response(JSON.stringify({ error: "Task not found" }), {
                status: 404,
                headers: { "Content-Type": "application/json" },
            });
        }
        const formattedTask = {
            ...updatedTask,
            context_tasks: updatedTask.context_tasks
                ? JSON.parse(updatedTask.context_tasks)
                : null,
            output_schema: updatedTask.output_schema
                ? JSON.parse(updatedTask.output_schema)
                : null,
            enabled: Boolean(updatedTask.enabled),
        };
        return new Response(JSON.stringify(formattedTask), {
            headers: { "Content-Type": "application/json" },
        });
    }
    catch (error) {
        console.error("Error updating task:", error);
        return new Response(JSON.stringify({ error: "Failed to update task" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
export async function handleTaskDelete(request, env, taskId) {
    try {
        // Check if task exists
        const { results } = await env.DB.prepare("SELECT id FROM task_configs WHERE id = ?")
            .bind(taskId)
            .all();
        if (results.length === 0) {
            return new Response(JSON.stringify({ error: "Task not found" }), {
                status: 404,
                headers: { "Content-Type": "application/json" },
            });
        }
        // Check if task is referenced by any workflows
        const { results: workflowResults } = await env.DB.prepare("SELECT COUNT(*) as count FROM workflow_configs WHERE task_sequence LIKE ?")
            .bind(`%"${taskId}"%`)
            .all();
        const countResult = workflowResults[0];
        if (countResult.count > 0) {
            return new Response(JSON.stringify({
                error: "Cannot delete task: it is referenced by existing workflows",
            }), {
                status: 409,
                headers: { "Content-Type": "application/json" },
            });
        }
        // Check if task is referenced as context by other tasks
        const { results: contextResults } = await env.DB.prepare("SELECT COUNT(*) as count FROM task_configs WHERE context_tasks LIKE ?")
            .bind(`%"${taskId}"%`)
            .all();
        const contextCountResult = contextResults[0];
        if (contextCountResult.count > 0) {
            return new Response(JSON.stringify({
                error: "Cannot delete task: it is referenced as context by other tasks",
            }), {
                status: 409,
                headers: { "Content-Type": "application/json" },
            });
        }
        await env.DB.prepare("DELETE FROM task_configs WHERE id = ?")
            .bind(taskId)
            .run();
        return new Response("", { status: 204 });
    }
    catch (error) {
        console.error("Error deleting task:", error);
        return new Response(JSON.stringify({ error: "Failed to delete task" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
